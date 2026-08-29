import socket
import select
import threading
import struct
import os

# Eş zamanlı bağlantı üst sınırı — DoS koruması
_MAX_CONNECTIONS = 20
_active_connections = 0
_conn_lock = threading.Lock()

def resolve_dns_via_public(hostname, dns_server='8.8.8.8'):
    try:
        packet = struct.pack(">HHHHHH", 0x1a1a, 0x0100, 1, 0, 0, 0)
        for part in hostname.split('.'):
            packet += struct.pack("B", len(part)) + part.encode('utf-8')
        packet += b'\x00'
        packet += struct.pack(">HH", 1, 1) # Type A, Class IN
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(3.0)
        sock.sendto(packet, (dns_server, 53))
        data, _ = sock.recvfrom(1024)
        
        answers_count = struct.unpack(">H", data[6:8])[0]
        if answers_count == 0:
            return None
        
        idx = len(packet)
        for _ in range(answers_count):
            # Skip name
            while idx < len(data):
                val = data[idx]
                if val & 0xc0 == 0xc0:
                    idx += 2
                    break
                elif val == 0:
                    idx += 1
                    break
                else:
                    idx += 1 + val
            
            type_, class_, ttl, rdlen = struct.unpack(">HHIH", data[idx:idx+10])
            idx += 10
            if type_ == 1 and rdlen == 4: # Type A
                ip = socket.inet_ntoa(data[idx:idx+4])
                return ip
            idx += rdlen
    except Exception as e:
        print(f"DNS resolution error for {hostname}: {e}")
    return None

def handle_client(client_socket):
    global _active_connections
    with _conn_lock:
        if _active_connections >= _MAX_CONNECTIONS:
            client_socket.sendall(b"HTTP/1.1 503 Service Unavailable\r\n\r\nToo many connections")
            client_socket.close()
            return
        _active_connections += 1
    try:
        request = client_socket.recv(4096)
        if not request:
            return
        lines = request.split(b'\r\n')
        first_line = lines[0].decode('utf-8', errors='ignore')
        words = first_line.split()
        if len(words) < 2 or words[0] != 'CONNECT':
            client_socket.sendall(b"HTTP/1.1 400 Bad Request\r\n\r\nOnly CONNECT method supported")
            return
        
        host_port = words[1]
        if ':' in host_port:
            host, port = host_port.split(':')
            port = int(port)
        else:
            host = host_port
            port = 443
        
        # Try custom resolution first
        ip = resolve_dns_via_public(host)
        if not ip:
            # Fallback to system resolution (though it might fail if system DNS is broken)
            try:
                ip = socket.gethostbyname(host)
            except Exception:
                ip = host
        
        print(f"Proxying request for {host} ({ip}:{port})")
        
        dest_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        dest_socket.settimeout(10.0)
        dest_socket.connect((ip, port))
        
        client_socket.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        
        sockets = [client_socket, dest_socket]
        while True:
            r, w, x = select.select(sockets, [], [], 30)
            if not r:
                break # Timeout
            if client_socket in r:
                data = client_socket.recv(4096)
                if not data:
                    break
                dest_socket.sendall(data)
            if dest_socket in r:
                data = dest_socket.recv(4096)
                if not data:
                    break
                client_socket.sendall(data)
    except Exception as e:
        print(f"Error handling client: {e}")
    finally:
        client_socket.close()
        with _conn_lock:
            _active_connections -= 1

def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    # Yalnızca loopback — dış ağdan erişilemez
    server.bind(('127.0.0.1', 8888))
    server.listen(_MAX_CONNECTIONS)
    print(f"User-space proxy listening on 127.0.0.1:8888 (max {_MAX_CONNECTIONS} concurrent connections)")
    while True:
        try:
            client_socket, addr = server.accept()
            # Loopback dışı bağlantıları reddet (bind garantisi olsa da savunma katmanı)
            if not addr[0].startswith('127.'):
                client_socket.close()
                continue
            t = threading.Thread(target=handle_client, args=(client_socket,))
            t.daemon = True
            t.start()
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Accept error: {e}")

if __name__ == '__main__':
    main()

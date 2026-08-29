import socket
import struct

def resolve_dns_via_public(hostname, dns_server='8.8.8.8'):
    packet = struct.pack(">HHHHHH", 0x1a1a, 0x0100, 1, 0, 0, 0)
    for part in hostname.split('.'):
        packet += struct.pack("B", len(part)) + part.encode('utf-8')
    packet += b'\x00'
    packet += struct.pack(">HH", 1, 1) # Type A, Class IN
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(2.0)
    sock.sendto(packet, (dns_server, 53))
    data, _ = sock.recvfrom(1024)
    
    answers_count = struct.unpack(">H", data[6:8])[0]
    if answers_count == 0:
        raise Exception("No DNS answer")
    
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
    raise Exception("IP not found")

print("github.com resolved to:", resolve_dns_via_public("github.com"))

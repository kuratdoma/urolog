import csv
import psycopg2
from app.core.config import settings

def export_patients_csv():
    # Use sync connection for simple export
    # Note: app.core.config.settings will have DB_HOST='localhost' and DB_PORT='5440' 
    # if it detected local environment in its post_init.
    
    db_params = {
        "dbname": settings.DB_NAME,
        "user": settings.DB_USER,
        "password": settings.DB_PASSWORD,
        "host": settings.DB_HOST,
        "port": settings.DB_PORT
    }
    
    output_file = "hasta_listesi.csv"
    
    try:
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()
        
        # Query for name, surname, and reference
        query = "SELECT ad, soyad, referans FROM hastalar ORDER BY ad, soyad;"
        cur.execute(query)
        
        rows = cur.fetchall()
        
        with open(output_file, mode='w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Ad', 'Soyad', 'Referans'])
            writer.writerows(rows)
            
        print(f"Successfully exported {len(rows)} patients to {output_file}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error during export: {e}")

if __name__ == "__main__":
    export_patients_csv()

import http.server
import socketserver
import csv
import json
import os

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        try:
            with open('.' + self.path, 'rb') as f:
                self.send_response(200)
                if self.path.endswith('.html'):
                    self.send_header('Content-type', 'text/html')
                elif self.path.endswith('.css'):
                    self.send_header('Content-type', 'text/css')
                elif self.path.endswith('.js'):
                    self.send_header('Content-type', 'application/javascript')
                elif self.path.endswith('.svg'):
                    self.send_header('Content-type', 'image/svg+xml')
                else:
                    self.send_header('Content-type', 'application/octet-stream')
                self.end_headers()
                self.wfile.write(f.read())
        except:
            self.send_error(404)

    def do_POST(self):
        if self.path == '/api/orders':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            # append to csv
            csv_file = 'acquisti.csv'
            # find max id
            max_id = 0
            if os.path.exists(csv_file):
                with open(csv_file, 'r', newline='') as f:
                    reader = csv.reader(f)
                    rows = list(reader)
                    if len(rows) > 1:
                        ids = []
                        for row in rows[1:]:
                            if row and row[0].isdigit():
                                ids.append(int(row[0]))
                        if ids:
                            max_id = max(ids)
            new_id = max_id + 1
            items_str = '|'.join(f"{it['titolo']};{it['prezzo']};{it['qty']}" for it in data['items'])
            row = [
                str(new_id),
                data['timestamp'],
                data['buyer']['email'],
                data['buyer']['nome'],
                data['buyer']['cognome'],
                data['buyer']['indirizzo'],
                data['buyer']['citta'],
                data['buyer']['cap'],
                data['buyer']['cantone'],
                data['buyer']['messaggio'],
                items_str,
                str(data['subtotal']),
                str(data['shipping']),
                str(data['total']),
                'nuovo'
            ]
            with open(csv_file, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(row)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'orderNumber': new_id}).encode())
        else:
            self.send_error(404)

if __name__ == '__main__':
    with socketserver.TCPServer(("", 8000), Handler) as httpd:
        print("Server running on http://localhost:8000")
        httpd.serve_forever()
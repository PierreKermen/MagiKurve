import http.server
import json
import os
from mana_optimizer import create_manabase

class ManaBridgeHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/optimize':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                input_data = json.loads(post_data)
                result = create_manabase(
                    input_data['available_lands'],
                    input_data['requirements'],
                    input_data['total_lands'],
                    input_data['strategy']
                )
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run(port=8000):
    server_address = ('', port)
    httpd = http.server.HTTPServer(server_address, ManaBridgeHandler)
    print(f"Serving ManaKurve at http://localhost:{port}")
    print(f"Python bridge active at http://localhost:{port}/optimize")
    httpd.serve_forever()

if __name__ == "__main__":
    run()

import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';

const PORT = 3001;

//1. membuat server
const server = http.createServer((req, res) => {
  fs.readFile('./public/index.html', (err, data) => {
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.end(data)
  })
})

//3. menyiapkan web socket
const wss = new WebSocketServer({ server })

// helper: kirim pesan ke semua client yang terkoneksi (opsional exclude satu client)
function broadcast(data, exclude = null) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws, req) => {
  // ambil username dari query string, misal ws://localhost:3001?username=Budi
  const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
  const username = params.get('username') || 'Anonymous';
  ws.username = username;

  // 4. beri tahu client lain bahwa ada yang join
  broadcast(
    { type: 'system', text: `${username} has joined the chat` },
    ws // exclude diri sendiri, karena spec bilang "existing clients"
  );

  // 5. saat ada pesan chat masuk
  ws.on('message', (raw) => {
    let text;
    try {
      const parsed = JSON.parse(raw);
      text = parsed.text;
    } catch {
      text = raw.toString();
    }

    // broadcast ke SEMUA client termasuk pengirim
    broadcast({ type: 'chat', username: ws.username, text });
  });

  // 6. saat client disconnect
  ws.on('close', () => {
    broadcast({ type: 'system', text: `${username} has left the chat` });
  });
});


//2. menjalankan server
server.listen(PORT, ()=> {
    console.log(`Chat server running at http://localhost:${PORT}`)
})

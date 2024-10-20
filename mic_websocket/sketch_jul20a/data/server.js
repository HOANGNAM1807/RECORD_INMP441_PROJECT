/////////////////////////////////////////////////////////////////
/*
  Broadcasting Your Voice with ESP32-S3 & INMP441
  For More Information: https://youtu.be/qq2FRv0lCPw
  Created by Eric N. (ThatProject)
*/
/////////////////////////////////////////////////////////////////
const fs = require('fs');
const path = require("path");
const express = require("express");
const WebSocket = require("ws");
const app = express();

//bổ sung
function createWavHeader(sampleRate, numChannels, bitsPerSample, dataLength) {
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + dataLength, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataLength, true);
  return Buffer.from(buffer);
}



const WS_PORT = process.env.WS_PORT || 8888;
const HTTP_PORT = process.env.HTTP_PORT || 8000;

const wsServer = new WebSocket.Server({ port: WS_PORT }, () =>
  console.log(`WS server is listening at ws://localhost:${WS_PORT}`)
);

// array of connected websocket clients (bổ sung)-------------------------------
let connectedClients = [];

let id = 0;

let ind = 0;
let myData = new Array(1920000).fill(1);
let reData = [];
//bổ sung --------------------------------------------------------------------------


wsServer.on("connection", (ws, req) => {
  console.log("Connected");


  connectedClients.push(ws);


  ws.on("message", (data) => {


    // connectedClients.forEach((ws, i) => {
    //   if (ws.readyState === ws.OPEN) {
    //     ws.send(data);
    //   } else {
    //     connectedClients.splice(i, 1);
    //   }
    // });
//bổ sung--------------------------------------------
    if (typeof data === 'string') {
      reData = Buffer.from(data, 'binary');
    } else if (Buffer.isBuffer(data)) {
      reData = data;
    } else if (data instanceof ArrayBuffer) {
      reData = Buffer.from(new Uint8Array(data));
    } else {
      // Handle other cases as necessary
      reData = Buffer.from(data);
    }
    // Fill `myData` with incoming data
    for (let i = 0; i < 1024 && ind < 1920000; i++) {
      myData[ind] = reData[i];
      ind++;
    }
//---------------------------------------------------------

    connectedClients.forEach((ws, i) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(reData);
      } else {
        connectedClients.splice(i, 1);
      }
    });






    // Check if the array is full and needs to be written to a file
    if (ind >= 1920000) {
      const audioBuffer = Buffer.from(myData);
      const wavHeader = createWavHeader(44100, 1, 16, audioBuffer.length);
      const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);

      fs.writeFile(`AT/outPut${id}.wav`, wavBuffer, (err) => {
        if (err) {
          console.log('Error writing file:', err);
        } else {
          id = id + 1;
          console.log('Success writing file');
        }
      });


      ind = 0;
    }

    // connectedClients.forEach((ws, i) => {
    //   if (ws.readyState === ws.OPEN) {
    //     ws.send(data);
    //   } else {
    //     connectedClients.splice(i, 1);
    //   }
    // });


  });

});





// HTTP stuff
app.use("/image", express.static("image"));
app.use("/js", express.static("js"));
app.get("/audio", (req, res) =>
  res.sendFile(path.resolve(__dirname, "./audio_client.html"))
);
app.listen(HTTP_PORT, () =>
  console.log(`HTTP server listening at http://localhost:${HTTP_PORT}`)
);

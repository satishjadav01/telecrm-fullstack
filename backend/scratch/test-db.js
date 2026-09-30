const fs = require('fs');
const path = require('path');

const filePath = path.resolve('c:/Users/admin/Downloads/tele-crm/tele-crm/backend/uploads/recordings/2026/04/call_75d72efc-2434-4598-9c27-6b15add12b1e_1777284328186.m4a');

if (fs.existsSync(filePath)) {
  const stat = fs.statSync(filePath);
  console.log(`File exists. Size: ${stat.size} bytes`);
  
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(100);
  const bytesRead = fs.readSync(fd, buffer, 0, 100, 0);
  fs.closeSync(fd);
  
  console.log(`First 100 bytes read:`);
  console.log(buffer.slice(0, bytesRead));
  console.log(`As string:`, buffer.slice(0, bytesRead).toString('ascii'));
  console.log(`Hex:`, buffer.slice(0, bytesRead).toString('hex'));
} else {
  console.log("File does not exist!");
}

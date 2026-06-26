import fs from "fs";
import path from "path";

export const CHAT_UPLOAD_DIR = path.join(process.cwd(), "chat-uploads");
fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });

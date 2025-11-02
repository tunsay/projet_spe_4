import { useEffect, useRef, useState } from "react";
import useSocketContext from "@/provider/socket";


interface CallCollaborationProps {
    documentId: string | undefined;
    sendAudio : (documentId: string, data: Blob) => void 
}

export function CallCollaboration ({
    documentId,
    sendAudio
} : CallCollaborationProps) {

  const [statusRef, setStatusRef] = useState<"Calling" | "StandBy"> ("StandBy");

  const startRecording = async () => {
    if(!documentId){
      return;
    }
    if (statusRef === "StandBy") {
      setStatusRef("Calling");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio:true })
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
            console.log(`L'event est : ${event} et l'event data est ${event.data}`)
            sendAudio(documentId, event.data);
        }
    });
    mediaRecorder.start(250); //sending blobs of data every 250ms
  };

  return (
    <div>
      <button onClick={startRecording}> Call</button>
      <div id="status" >
            {statusRef}
        </div>
    </div>
  );
};

export default CallCollaboration;
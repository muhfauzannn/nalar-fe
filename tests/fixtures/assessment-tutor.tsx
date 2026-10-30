import { createRoot } from "react-dom/client";
import { useAiTutorLive } from "../../app/features/lms/hooks/use-ai-tutor-live";
const target = { targetType: "quiz" as const, targetId: "attempt-a", questionId: "question-a" };
function Fixture() {
  const tutor = useAiTutorLive(target);
  return <main>
    <button onClick={() => tutor.connect()}>Connect</button>
    <button onClick={() => tutor.sendText("Berikan jawaban soal ini")}>Send question</button>
    <button onClick={() => tutor.disconnect()}>Disconnect</button>
    <button onClick={() => tutor.startVoice()}>Start voice</button>
    <button onClick={() => tutor.endVoice()}>End voice</button>
    <output data-testid="listening">{String(tutor.isListening)}</output>
    <output data-testid="status">{tutor.status}</output>
    <output data-testid="input-preview">{tutor.inputTranscript}</output>
    <output data-testid="transcript">{tutor.outputTranscript}</output>
    <output data-testid="error">{tutor.error}</output>
    <output data-testid="notice">{tutor.notice}</output>
    <ol>{tutor.messages.map((message) => <li key={message.id} data-author={message.author} data-redirected={message.wasRedirected}>{message.content}</li>)}</ol>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);

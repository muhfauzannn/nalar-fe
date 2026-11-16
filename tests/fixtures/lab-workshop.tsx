import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LabWorkshop } from "../../app/features/labs/craft/lab-workshop";
import "../../app/app.css";

// The lesson editor's lab workshop on its own: the catalog lives in state and "attaching" removes a lab from it,
// the way the editor's loader would after the action.
const CATALOG = [
  { key: "gerak-parabola", title: "Gerak parabola", subject: "Fisika" },
  { key: "mesin-gelombang", title: "Mesin gelombang", subject: "Matematika" },
  { key: "reaktor-tumbukan", title: "Reaktor tumbukan", subject: "Kimia" },
  { key: "mikroskop-osmosis", title: "Mikroskop osmosis", subject: "Biologi" },
];

function Page() {
  const [available, setAvailable] = useState(CATALOG);
  const [attached, setAttached] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-4 bg-background p-4 text-foreground sm:p-8">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">Lab interaktif</h2>
      <output data-testid="attached">{attached.join(",")}</output>
      <LabWorkshop
        available={available}
        pending={pending}
        onAttach={(key) => {
          setPending(true);
          setTimeout(() => {
            setPending(false);
            setAttached((now) => [...now, key]);
            setAvailable((now) => now.filter((lab) => lab.key !== key));
          }, 300);
        }}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Page />);

import { Check, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { MathText } from "~/components/math-text";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { chipClass } from "~/components/ui/chip";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Textarea } from "~/components/ui/textarea";
import { LabWorkshop } from "~/features/labs/craft/lab-workshop";
import { Sticker } from "~/features/labs/craft/stickers/Sticker";
import { buku, catatan, dokumen, map, small, tautan } from "~/features/labs/craft/stickers/editor-icons";
import type { Icon } from "~/features/labs/craft/stickers/fun";
import { BENGKEL, labu } from "~/features/labs/craft/stickers/icons";
import { formatFileSize, manageResourceFileUrl } from "~/lib/files";
import { cn } from "~/lib/utils";
import { ActionError, useAction } from "../components/action-feedback";
import { ConfirmAction } from "../components/confirm-action";
import { ListItem } from "../components/list-item";
import { ReorderControls } from "../components/reorder-controls";
import { ResourceForm } from "../components/resource-form";
import { publicationStatusLabel } from "../lib/form";
import { optimisticOrder, useFlip } from "../lib/motion";
import type { LessonEditorData, ManagedResource, PublicationStatus } from "../types";

type Tab = "materi" | "lab" | "resource";
// small copies with a heavier outline, made once so a sticker keeps its player across renders
const TAB_ICONS: Record<Tab, Icon> = { materi: small(buku), lab: small(labu), resource: small(map) };
const TYPE_ICONS = { text: small(catatan, 11), file: small(dokumen, 11), link: small(tautan, 11) };
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "materi", label: "Materi" },
  { id: "lab", label: "Lab" },
  { id: "resource", label: "Resource" },
];
const FORM_ID = "lesson-form";

/**
 * The lesson editor does one job at a time: writing the material, setting up its lab, or attaching resources,
 * each on its own tab. The title is edited where it is shown, and saving lives in a bar that only appears
 * once something changed. Panels stay mounted while hidden, so the lesson form always posts its content.
 */
export function LessonEditorPage({ data }: { data: LessonEditorData }) {
  const { lesson } = data;
  const save = useAction();
  const [title, setTitle] = useState(lesson.title);
  const [status, setStatus] = useState<PublicationStatus>(lesson.status);
  const [draft, setDraft] = useState(lesson.content ?? "");
  const dirty = title !== lesson.title || status !== lesson.status || draft !== (lesson.content ?? "");
  const tab = useTab();
  const saved = useSavedFlash(save.pending, save.error);
  const form = useRef<HTMLFormElement>(null);

  // Ctrl/Cmd+S saves, the way every editor does
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty) form.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty]);

  const discard = () => {
    setTitle(lesson.title);
    setStatus(lesson.status);
    setDraft(lesson.content ?? "");
  };

  const counts: Record<Tab, number | null> = { materi: null, lab: data.labs.length, resource: data.resources.length };

  return (
    <div className="flex flex-col gap-6 pb-28">
      <PageHeader
        crumbs={[
          { label: "Kelola course", to: "/manage" },
          { label: lesson.courseName, to: `/manage/courses/${lesson.courseId}?tab=content` },
        ]}
        eyebrow={
          <>
            <NativeSelect
              aria-label="Status lesson"
              form={FORM_ID}
              name="status"
              size="sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as PublicationStatus)}
              className="w-auto"
            >
              {(["draft", "published", "archived"] as PublicationStatus[]).map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {publicationStatusLabel[value]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Badge variant="outline" className="max-w-full truncate">
              {lesson.moduleTitle}
            </Badge>
          </>
        }
        title={
          <textarea
            aria-label="Judul lesson"
            form={FORM_ID}
            name="title"
            required
            rows={1}
            maxLength={160}
            value={title}
            // a title is one line: Enter leaves the field instead of breaking it
            onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), event.currentTarget.blur())}
            onChange={(event) => setTitle(event.target.value.replace(/\n/g, " "))}
            placeholder="Judul lesson"
            className="-mx-2 block field-sizing-content max-w-[calc(100%+1rem)] min-w-[10ch] resize-none rounded-xl bg-transparent px-2 py-0.5 outline-none hover:bg-muted/60 focus:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        }
      />

      <div
        role="tablist"
        aria-label="Bagian lesson"
        className="sticky top-0 z-20 -mx-4 grid grid-cols-3 gap-2 bg-background/85 px-4 py-2 backdrop-blur sm:mx-0 sm:flex sm:px-0"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab.current === id}
            aria-controls={`panel-${id}`}
            data-active={tab.current === id || undefined}
            onClick={() => tab.set(id)}
            className={cn(
              chipClass,
              "h-11 gap-1 px-2 sm:gap-1.5 sm:pr-4 sm:pl-3",
              // stickers carry an ink outline, so the chosen tab lights up lavender instead of going navy
              "data-active:bg-brand-lavender-soft data-active:text-brand-lavender-foreground data-active:ring-2 data-active:ring-brand-lavender",
            )}
          >
            <span className="-my-1.5 size-7 shrink-0 sm:size-9" aria-hidden="true">
              <Sticker icon={TAB_ICONS[id]} palette={BENGKEL} loop={tab.current === id} replayOnHover label="" />
            </span>
            {label}
            {counts[id] ? <span data-slot="chip-count">{counts[id]}</span> : null}
          </button>
        ))}
      </div>

      <Panel id="materi" current={tab.current}>
        <save.fetcher.Form ref={form} id={FORM_ID} method="post" className="flex flex-col gap-3">
          <input type="hidden" name="intent" value="lesson-update" />
          <ActionError error={save.error} />
          <MaterialEditor draft={draft} onDraft={setDraft} />
        </save.fetcher.Form>
      </Panel>

      <Panel id="lab" current={tab.current}>
        <LabsPanel data={data} />
      </Panel>

      <Panel id="resource" current={tab.current}>
        <ResourcesPanel data={data} />
      </Panel>

      {(dirty || save.pending || saved) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div
            role="status"
            className="enter-up pointer-events-auto flex items-center gap-2 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm text-background shadow-lg"
          >
            {saved && !dirty ? (
              <span className="flex items-center gap-1.5 py-1.5 pr-2.5">
                <Check className="size-4 text-brand-mint" aria-hidden="true" />
                Tersimpan
              </span>
            ) : (
              <>
                <span className="pr-1">Ada perubahan</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-background hover:bg-background/10 hover:text-background"
                  onClick={discard}
                  disabled={save.pending}
                >
                  Batalkan
                </Button>
                <Button type="submit" form={FORM_ID} size="sm" variant="mint" loading={save.pending}>
                  Simpan
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** The tab in the address bar's hash, so "Pasang lab" on the course page (…#lab) opens the lab tab. */
function useTab() {
  const { hash } = useLocation();
  const fromHash = (value: string): Tab => (value === "#lab" ? "lab" : value === "#resource" ? "resource" : "materi");
  // the server never sees the hash: start on Materi and switch once the page is in the browser
  const [current, setCurrent] = useState<Tab>("materi");
  useEffect(() => setCurrent(fromHash(hash || window.location.hash)), [hash]);
  useEffect(() => {
    const follow = () => setCurrent(fromHash(window.location.hash));
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);
  return {
    current,
    set: (next: Tab) => {
      setCurrent(next);
      // a hash change without a navigation: the loaders stay put
      window.history.replaceState(window.history.state, "", next === "materi" ? window.location.pathname + window.location.search : `#${next}`);
    },
  };
}

/** "Tersimpan" for two seconds after a save that went through. */
function useSavedFlash(pending: boolean, error: string | null) {
  const [saved, setSaved] = useState(false);
  const was = useRef(pending);
  useEffect(() => {
    if (was.current && !pending && !error) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2000);
      was.current = pending;
      return () => clearTimeout(timer);
    }
    was.current = pending;
  }, [pending, error]);
  return saved;
}

function Panel({ id, current, children }: { id: Tab; current: Tab; children: ReactNode }) {
  return (
    <section id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={current !== id} className="enter-fade">
      {children}
    </section>
  );
}

/** Writing and reading side by side on a wide screen; one of the two, switched, on a narrow one. */
function MaterialEditor({ draft, onDraft }: { draft: string; onDraft: (next: string) => void }) {
  const [view, setView] = useState<"tulis" | "lihat">("tulis");
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-full bg-muted p-1 lg:hidden" role="group" aria-label="Tampilan">
          {(["tulis", "lihat"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
            >
              {value === "tulis" ? "Tulis" : "Pratinjau"}
            </button>
          ))}
        </div>
        <p className="hidden text-sm text-muted-foreground lg:block">Kiri kamu menulis, kanan yang dilihat siswa.</p>
        <p className="text-xs text-muted-foreground tabular-nums">{words} kata</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn("flex flex-col gap-2", view !== "tulis" && "max-lg:hidden")}>
          <Textarea
            aria-label="Konten lesson"
            name="content"
            rows={18}
            maxLength={50_000}
            className="min-h-[28rem] flex-1 resize-y rounded-2xl p-4 font-mono text-sm/relaxed"
            placeholder="Mulai tulis materi di sini…"
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Rumus: <code className="rounded bg-muted px-1">\( x^2 \)</code> di dalam baris, <code className="rounded bg-muted px-1">\[ x^2 \]</code> sebagai blok.
          </p>
        </div>
        <div
          data-testid="lesson-preview"
          className={cn("min-h-[28rem] rounded-2xl bg-muted/40 p-6 text-[0.95rem]/relaxed", view !== "lihat" && "max-lg:hidden")}
        >
          {draft.trim() ? (
            <MathText>{draft}</MathText>
          ) : (
            <div className="flex h-full min-h-80 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <div className="size-24">
                <Sticker icon={buku} palette={BENGKEL} label="Buku materi" />
              </div>
              Pratinjau muncul di sini begitu kamu menulis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Labs come from Bernalar's catalog (PRD §5.10); a teacher only picks which
// ones sit on this lesson. A lab students already used cannot be removed.
function LabsPanel({ data }: { data: LessonEditorData }) {
  const attach = useAction();
  const detach = useAction();
  const available = data.labCatalog.filter((lab) => !data.labs.some((item) => item.labKey === lab.key));
  const catalogLab = (key: string) => data.labCatalog.find((lab) => lab.key === key);

  return (
    <div className="flex flex-col gap-4">
      <ActionError error={attach.error ?? detach.error} />
      {data.labs.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Lab di lesson ini">
          {data.labs.map((lab) => (
            <li key={lab.id} className="flex items-center gap-2 rounded-full bg-brand-mint-soft py-1 pr-1 pl-3 text-sm text-brand-mint-foreground">
              <span className="-my-1 size-7 shrink-0" aria-hidden="true">
                <Sticker icon={TAB_ICONS.lab} palette={BENGKEL} loop={false} replayOnHover label="" />
              </span>
              <span className="font-semibold">{catalogLab(lab.labKey)?.title ?? lab.labKey}</span>
              <span className="opacity-70">{catalogLab(lab.labKey)?.subject}</span>
              <ConfirmAction
                label="Lepas"
                size="xs"
                title="Lepas lab ini?"
                description="Siswa tidak akan melihat lab ini lagi di lesson ini."
                confirmLabel="Lepas lab"
                variant="ghost"
                icon={<Trash2 />}
                disabled={detach.pending}
                onConfirm={() => detach.submit({ intent: "lab-detach", labId: lab.id })}
              />
            </li>
          ))}
        </ul>
      )}
      <LabWorkshop
        available={available}
        pending={attach.pending}
        onAttach={(labKey) => attach.submit({ intent: "lab-attach", labKey })}
      />
    </div>
  );
}

function ResourcesPanel({ data }: { data: LessonEditorData }) {
  const { lesson, resources } = data;
  const [adding, setAdding] = useState(false);
  const order = useAction();
  const shownResources = optimisticOrder(resources, order.formData);
  const ids = shownResources.map((resource) => resource.id);
  const flip = useFlip<HTMLUListElement>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Catatan, tautan, atau PDF yang muncul di bawah lesson.</p>
        {!adding && (
          <Button type="button" variant="outline" onClick={() => setAdding(true)}>
            <Plus data-icon="inline-start" />
            Tambah resource
          </Button>
        )}
      </div>

      {adding ? (
        <div className="enter-up rounded-2xl bg-muted/40 p-4 sm:p-5">
          <ResourceForm lessonId={lesson.id} onDone={() => setAdding(false)} />
        </div>
      ) : null}

      <ActionError error={order.error} />
      {resources.length === 0 ? (
        !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <div className="size-24">
              <Sticker icon={map} palette={BENGKEL} label="Map resource" />
            </div>
            Belum ada resource. Tambahkan tautan, catatan, atau PDF.
          </button>
        )
      ) : (
        <ul
          ref={flip.ref}
          className="divide-y divide-border overflow-hidden rounded-2xl ring-1 ring-border"
          aria-label="Daftar resource"
        >
          {shownResources.map((resource, index) => (
            <ResourceRow
              key={resource.id}
              index={index}
              lessonId={lesson.id}
              resource={resource}
              orderControls={
                <ReorderControls
                  ids={ids}
                  index={index}
                  label={`resource ${resource.title}`}
                  onChange={(next) => {
                    flip.capture();
                    order.submit({
                      intent: "resource-order",
                      lessonId: lesson.id,
                      ids: JSON.stringify(next),
                    });
                  }}
                />
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ResourceRow({
  lessonId,
  resource,
  index,
  orderControls,
}: {
  lessonId: string;
  resource: ManagedResource;
  index: number;
  orderControls: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const remove = useAction();
  const icon = resource.type === "text" ? TYPE_ICONS.text : resource.file || resource.type === "file" ? TYPE_ICONS.file : TYPE_ICONS.link;

  return (
    <ListItem flipKey={resource.id} index={index} data-testid="resource-row" className="flex flex-col gap-3 bg-background p-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-3">
        {orderControls}
        <span className="hidden size-11 shrink-0 rounded-xl bg-muted/50 p-0.5 sm:block" aria-hidden="true">
          <Sticker icon={icon} palette={BENGKEL} loop={false} replayOnHover label="" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col max-sm:order-first max-sm:basis-full">
          <span className="truncate font-medium">{resource.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {resource.type === "text"
              ? "Teks"
              : resource.file
                ? "PDF — "
                : resource.type === "file"
                  ? "File — "
                  : "Tautan — "}
            {resource.file ? (
              <a
                href={manageResourceFileUrl(resource.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4"
              >
                {resource.file.name} ({formatFileSize(resource.file.size)})
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            ) : resource.url ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4"
              >
                {resource.url}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            ) : null}
          </span>
          {resource.type === "text" && resource.content ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              <MathText>{resource.content}</MathText>
            </p>
          ) : null}
        </div>
        <span className="flex-1 sm:hidden" aria-hidden="true" />
        <Button type="button" size="xs" variant="ghost" onClick={() => setEditing((value) => !value)}>
          <Pencil /> {editing ? "Tutup" : "Ubah"}
        </Button>
        <ConfirmAction
          label="Hapus"
          size="xs"
          variant="ghost"
          icon={<Trash2 />}
          title="Hapus resource ini?"
          description={`"${resource.title}" akan dihapus dari lesson dan tidak bisa dikembalikan.`}
          confirmLabel="Hapus"
          disabled={remove.pending}
          onConfirm={() => remove.submit({ intent: "resource-delete", resourceId: resource.id })}
        />
      </div>
      <ActionError error={remove.error} />
      {editing ? (
        <div className="enter-up rounded-xl bg-muted/40 p-4">
          <ResourceForm lessonId={lessonId} resource={resource} onDone={() => setEditing(false)} />
        </div>
      ) : null}
    </ListItem>
  );
}

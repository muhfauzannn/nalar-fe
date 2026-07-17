import { InboxIcon, InfoIcon, PlusIcon, SearchIcon } from "lucide-react";

import { Container } from "~/components/layout/container";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { Row, Section } from "../components/section";
import { Swatch } from "../components/swatch";
import { ThemeToggle } from "../components/theme-toggle";

const SEMANTIC_TOKENS = [
  { name: "background", className: "bg-background" },
  { name: "foreground", className: "bg-foreground" },
  { name: "card", className: "bg-card" },
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "accent", className: "bg-accent" },
  { name: "destructive", className: "bg-destructive" },
  { name: "border", className: "bg-border" },
  { name: "ring", className: "bg-ring" },
];

const BRAND_TOKENS = [
  { name: "primary", className: "bg-primary", hint: "Navy · CTA" },
  { name: "brand-mint", className: "bg-brand-mint", hint: "Accent" },
  { name: "brand-lavender", className: "bg-brand-lavender", hint: "Accent" },
  { name: "brand-mint-soft", className: "bg-brand-mint-soft", hint: "Tag bg" },
  {
    name: "brand-lavender-soft",
    className: "bg-brand-lavender-soft",
    hint: "Tag bg",
  },
];

export function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <Container className="flex flex-col gap-16">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="lavender">Acsent</Badge>
            <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight">
              Design system
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Every component reads from the shared theme tokens — retheme once,
              stay consistent everywhere.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <Section
          id="colors"
          title="Colors"
          description="Brand accents and semantic tokens."
        >
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {BRAND_TOKENS.map((t) => (
                <Swatch key={t.name} {...t} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5">
              {SEMANTIC_TOKENS.map((t) => (
                <Swatch key={t.name} {...t} />
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="typography"
          title="Typography"
          description="Plus Jakarta Sans across the scale."
        >
          <div className="flex flex-col gap-3">
            <p className="font-heading text-5xl font-bold tracking-tight">
              Heading 1
            </p>
            <p className="font-heading text-4xl font-semibold tracking-tight">
              Heading 2
            </p>
            <p className="font-heading text-2xl font-semibold">Heading 3</p>
            <p className="text-lg">Body large — comfortable reading size.</p>
            <p className="text-base text-muted-foreground">
              Body medium — muted, for secondary paragraphs.
            </p>
            <p className="text-sm font-semibold tracking-wide uppercase">
              Label
            </p>
          </div>
        </Section>

        <Section
          id="radius-shadow"
          title="Radius & elevation"
          description="Rounded corners and the soft card shadow."
        >
          <div className="flex flex-wrap gap-4">
            <div className="flex size-24 items-center justify-center rounded-md bg-card text-xs text-muted-foreground ring-1 ring-border/60">
              md
            </div>
            <div className="flex size-24 items-center justify-center rounded-lg bg-card text-xs text-muted-foreground ring-1 ring-border/60">
              lg
            </div>
            <div className="flex size-24 items-center justify-center rounded-xl bg-card text-xs text-muted-foreground ring-1 ring-border/60">
              xl
            </div>
            <div className="flex size-24 items-center justify-center rounded-xl bg-card text-xs text-muted-foreground shadow-card">
              shadow-card
            </div>
          </div>
        </Section>

        <Section
          id="buttons"
          title="Buttons"
          description="Pill-shaped, per DESIGN.md. Variants and sizes."
        >
          <div className="flex flex-col gap-6">
            <Row label="Variants">
              <Button>Start now</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Delete</Button>
              <Button variant="link">Link</Button>
            </Row>
            <Row label="Sizes">
              <Button size="xs">Extra small</Button>
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </Row>
            <Row label="With icon / icon-only">
              <Button>
                <PlusIcon data-icon="inline-start" />
                Add test
              </Button>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button size="icon" variant="outline" aria-label="Search">
                      <SearchIcon />
                    </Button>
                  }
                />
                <TooltipContent>Search</TooltipContent>
              </Tooltip>
            </Row>
          </div>
        </Section>

        <Section
          id="badges"
          title="Badges & tags"
          description="Pill tags, including brand mint and lavender."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="mint">IELTS Band 7</Badge>
            <Badge variant="lavender">Question bank</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Overdue</Badge>
          </div>
        </Section>

        <Section
          id="cards"
          title="Cards"
          description="White surface, soft diffuse shadow."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Mock test</CardTitle>
                <CardDescription>Full IELTS simulation.</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Timed sections with instant band scoring.
              </CardContent>
              <CardFooter>
                <Button size="sm">Begin</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Speaking</CardTitle>
                <CardDescription>AI-scored practice.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Badge variant="mint">Band 7.5</Badge>
                <Badge variant="lavender">12 sessions</Badge>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          id="forms"
          title="Form controls"
          description="Inputs, select, and checkboxes."
        >
          <div className="grid max-w-md gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@acsent.app" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="test">Test type</Label>
              <Select defaultValue="ielts">
                <SelectTrigger id="test" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ielts">IELTS</SelectItem>
                    <SelectItem value="toefl">TOEFL</SelectItem>
                    <SelectItem value="duolingo">Duolingo</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Anything to remember…" />
            </div>
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox defaultChecked />
              Email me my results
            </Label>
          </div>
        </Section>

        <Section
          id="table"
          title="Table"
          description="Tabular data with status tags."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Test</TableHead>
                <TableHead className="text-right">Band</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Sari</TableCell>
                <TableCell>IELTS</TableCell>
                <TableCell className="text-right">
                  <Badge variant="mint">7.5</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Budi</TableCell>
                <TableCell>TOEFL</TableCell>
                <TableCell className="text-right">
                  <Badge variant="lavender">102</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Section>

        <Section id="accordion" title="Accordion" description="FAQ-style list.">
          <Accordion className="max-w-xl">
            <AccordionItem>
              <AccordionTrigger>Is the test free?</AccordionTrigger>
              <AccordionContent>
                Yes — the first mock test is free for every account.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem>
              <AccordionTrigger>How is speaking scored?</AccordionTrigger>
              <AccordionContent>
                Automatically, against the official band descriptors.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        <Section
          id="feedback"
          title="Feedback & states"
          description="Skeleton, separator, and empty state."
        >
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
              <Separator className="my-2" />
              <p className="text-sm text-muted-foreground">Loading placeholder</p>
            </div>
            <Empty className="rounded-xl border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>No tests yet</EmptyTitle>
                <EmptyDescription>Start one to see it here.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm">
                  <PlusIcon data-icon="inline-start" />
                  New test
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        </Section>

        <Section
          id="overlays"
          title="Overlays"
          description="Dialog, popover, and tooltip."
        >
          <Row label="Triggers">
            <Dialog>
              <DialogTrigger render={<Button>Open dialog</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete test?</DialogTitle>
                  <DialogDescription>
                    This can't be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive">Delete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Popover>
              <PopoverTrigger render={<Button variant="outline">Popover</Button>} />
              <PopoverContent>
                <PopoverTitle>Quick tip</PopoverTitle>
                <PopoverDescription>
                  Popovers hold secondary detail.
                </PopoverDescription>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Info">
                    <InfoIcon />
                  </Button>
                }
              />
              <TooltipContent>Icon + tooltip pattern</TooltipContent>
            </Tooltip>
          </Row>
        </Section>
      </Container>
    </div>
  );
}

import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BRAND_SWATCHES = [
  { token: "brand-50", className: "bg-brand-50" },
  { token: "brand-100", className: "bg-brand-100" },
  { token: "brand-300", className: "bg-brand-300" },
  { token: "brand-400", className: "bg-brand-400" },
  { token: "brand-500", className: "bg-brand-500" },
  { token: "brand-600", className: "bg-brand-600" },
  { token: "brand-700", className: "bg-brand-700" },
  { token: "brand-800", className: "bg-brand-800" },
  { token: "brand-900", className: "bg-brand-900" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-neutral-100 px-6 py-16">
      <main className="flex w-full max-w-3xl flex-col gap-10">
        <header className="flex items-center gap-4">
          <Image src="/logotipo.png" alt="InfoHub" width={56} height={56} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              InfoHub → InovAMF
            </h1>
            <p className="text-sm text-muted-foreground">
              Setup inicial do frontend — tema de marca aplicado (T-FE-01)
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Paleta de marca</CardTitle>
            <CardDescription>
              Gradiente vermelho-bordô → laranja extraído de{" "}
              <code>assets/logotipo.png</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
              {BRAND_SWATCHES.map((swatch) => (
                <div key={swatch.token} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-12 w-12 rounded-md border border-border ${swatch.className}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {swatch.token}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Componentes shadcn/ui com o tema aplicado</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button>Ação primária</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destrutivo</Button>
            <Badge>Etapa 1</Badge>
            <Badge variant="secondary">Pendente</Badge>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

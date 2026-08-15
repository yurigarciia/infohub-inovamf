import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Valor sentinela pra "sem filtro selecionado" — convenção compartilhada
 * por todo `FilterSelect`, já que o `Select` do Base UI não aceita `""`
 * como valor de item. */
export const ALL_VALUE = "__all__";

/** Select de filtro genérico com opção "Todos/Todas" — usado no painel
 * do admin (área, status de tarefa, mentor, turma). */
export function FilterSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={(next) => onChange(next ?? ALL_VALUE)}>
        <SelectTrigger className="w-48">
          <SelectValue>
            {() =>
              value === ALL_VALUE
                ? placeholder
                : (options.find((o) => o.value === value)?.label ?? placeholder)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

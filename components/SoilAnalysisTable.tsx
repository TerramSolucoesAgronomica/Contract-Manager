
import { Control, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface SoilAnalysisTableProps {
    control: Control<any>;
    name: string;
    label: string;
}

export function SoilAnalysisTable({ control, name, label }: SoilAnalysisTableProps) {
    const { fields, append, remove } = useFieldArray({
        control,
        name
    });

    const addDefaultRow = () => {
        append({
            depth: "",
            samplesPct: "",
            macroPct: "",
            microPct: "",
            physicalPct: "",
            sulfurPct: "",
            extraPct: ""
        });
    };

    return (
        <div className="mt-6 border rounded-lg p-4 bg-slate-50">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-lg">{label}</h4>
                <Button type="button" variant="outline" size="sm" onClick={addDefaultRow}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Linha
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-left">
                            <th className="p-2 border">Perfil</th>
                            <th className="p-2 border">Amostras %</th>
                            <th className="p-2 border">Macro %</th>
                            <th className="p-2 border">Micro %</th>
                            <th className="p-2 border">Física %</th>
                            <th className="p-2 border">Enxofre %</th>
                            <th className="p-2 border">Extra</th>
                            <th className="p-2 border w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field, index) => (
                            <tr key={field.id} className="border-b bg-white">
                                <td className="p-1 border">
                                    <Input {...control.register(`${name}.${index}.depth`)} placeholder="0-10 cm" className="h-8" />
                                </td>
                                <td className="p-1 border">
                                    <Input {...control.register(`${name}.${index}.samplesPct`)} placeholder="%" className="h-8" />
                                </td>
                                <td className="p-1 border">
                                    <Input {...control.register(`${name}.${index}.macroPct`)} placeholder="Macro" className="h-8" />
                                </td>
                                <td className="p-1 border">
                                    <Input {...control.register(`${name}.${index}.microPct`)} placeholder="Micro" className="h-8" />
                                </td>
                                <td className="p-1 border">
                                    <Input {...control.register(`${name}.${index}.physicalPct`)} placeholder="Física" className="h-8" />
                                </td>
                                <td className="p-1 border">
                                    <Input {...control.register(`${name}.${index}.sulfurPct`)} placeholder="S" className="h-8" />
                                </td>
                                <td className="p-1 border">
                                    <Input {...control.register(`${name}.${index}.extraPct`)} placeholder="Outros" className="h-8" />
                                </td>
                                <td className="p-1 border text-center">
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {fields.length === 0 && (
                    <div className="text-center p-4 text-slate-500 text-sm">
                        Nenhuma linha adicionada.
                    </div>
                )}
            </div>
        </div>
    );
}

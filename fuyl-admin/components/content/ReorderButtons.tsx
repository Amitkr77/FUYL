"use client";
import { useTransition } from "react";
import { ArrowUp,ArrowDown } from "lucide-react";
import { reorderIngredientAction,reorderTestimonialAction } from "@/app/(admin)/content/actions";
export function ReorderButtons({id,type,first,last}:{id:string;order:number;type:'ingredient'|'testimonial';first:boolean;last:boolean}){const[pending,start]=useTransition();const run=(direction:'up'|'down')=>start(()=>type==='ingredient'?reorderIngredientAction(id,direction):reorderTestimonialAction(id,direction));return <div className="mb-1 flex gap-1"><button disabled={first||pending} onClick={()=>run('up')} title="Move up" className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5"/></button><button disabled={last||pending} onClick={()=>run('down')} title="Move down" className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5"/></button></div>}

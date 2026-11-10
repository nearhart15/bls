import type {ReactNode} from "react";
export const COLOR_A = "#ff2d55";
export const COLOR_B = "#00d4ff";

export function ComparisonBar({label,valueA,valueB,format,lowerIsBetter=false}: {
    label:string;valueA:number|null;valueB:number|null;format:(value:number|null)=>string;lowerIsBetter?:boolean;
}) {
    const a=valueA??0,b=valueB??0;
    const leader=valueA==null||valueB==null||a===b?"tie":(lowerIsBetter?a<b:a>b)?"a":"b";
    // The winning side always receives the larger share, including lower-is-better metrics.
    const total=Math.abs(a)+Math.abs(b);
    const fill=leader==="tie"||total===0?50:Math.max(Math.abs(a),Math.abs(b))/total*100;
    const color=leader==="a"?COLOR_A:leader==="b"?COLOR_B:"#6e6e73";
    return <div className="bls-fifa-row"><div className="bls-fifa-row-label">{label}</div><div className="bls-fifa-row-trackline">
        <span className={`bls-fifa-val${leader==="a"?" is-lead":""}`} style={{color:COLOR_A}}>{format(valueA)}</span>
        <div className="bls-fifa-track"><div className="bls-fifa-fill" style={{width:`${fill}%`,background:color,boxShadow:leader==="tie"?undefined:`0 0 10px ${color}`,marginLeft:leader==="b"?"auto":0}}/></div>
        <span className={`bls-fifa-val${leader==="b"?" is-lead":""}`} style={{color:COLOR_B}}>{format(valueB)}</span>
    </div></div>;
}

export function ComparisonCard({side,badge,name,metadata,children}:{side:"a"|"b";badge:ReactNode;name:ReactNode;metadata:ReactNode;children:ReactNode}) {
    const color=side==="a"?COLOR_A:COLOR_B;
    return <div className={`bls-fifa-pcard bls-fifa-pcard-${side}`} style={{borderColor:color,boxShadow:`0 0 18px ${color}40`}}>
        <div className="bls-fifa-pcard-badge" style={{borderColor:color,color}}>{badge}</div>
        <div className="bls-fifa-pcard-body"><div className="bls-fifa-pcard-name" style={{color}}>{name}</div><div className="bls-fifa-pcard-meta">{metadata}</div>{children}</div>
    </div>;
}

export function ComparisonTabs<Key extends string>({tabs,active,onChange}:{tabs:[Key,string][];active:Key;onChange:(key:Key)=>void}) {
    return <div className="bls-fifa-tabs" role="tablist">{tabs.map(([id,label])=><button key={id} type="button" role="tab" aria-selected={active===id} className={`bls-fifa-tab${active===id?" is-active":""}`} onClick={()=>{onChange(id);}}>{label}</button>)}</div>;
}

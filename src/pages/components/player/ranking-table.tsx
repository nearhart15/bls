import type {ReactNode} from "react";
import {Table} from "react-bootstrap";

export function RankingTable<Row>({rows,rowKey,renderName,teamName,value,valueLabel,compact=false,emptyMessage="No bowlers match the filters."}:{
    rows:Row[];rowKey:(row:Row)=>string;renderName:(row:Row)=>ReactNode;teamName:(row:Row)=>string;value:(row:Row)=>ReactNode;valueLabel:string;compact?:boolean;emptyMessage?:string;
}) {
    return <div className="table-responsive"><Table hover size={compact?"sm":undefined} className="mb-0 align-middle"><thead><tr><th>#</th><th>Bowler</th><th>Team</th><th className="text-end">{valueLabel}</th></tr></thead><tbody>
        {rows.length===0&&<tr><td colSpan={4} className="text-center py-4">{emptyMessage}</td></tr>}
        {rows.map((row,index)=><tr key={rowKey(row)}><td>{index+1}</td><td>{renderName(row)}</td><td>{teamName(row)}</td><td className="text-end fw-semibold">{value(row)}</td></tr>)}
    </tbody></Table></div>;
}

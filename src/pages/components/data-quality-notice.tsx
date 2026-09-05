import {useSyncExternalStore} from "react";
import {getDataQuality, subscribeDataQuality} from "../../data/utils/data-quality";
export default function DataQualityNotice(){const warnings=useSyncExternalStore(subscribeDataQuality,getDataQuality,getDataQuality);return warnings.length ? <div role="alert" className="alert alert-warning"><strong>Some league data could not be included.</strong><p>Totals and rankings below are partial. Correct the listed data and use Refresh to retry.</p><ul>{warnings.map(message=><li key={message}>{message}</li>)}</ul></div>:null;}

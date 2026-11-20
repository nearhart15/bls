import {useId, useRef, useState, useSyncExternalStore, type SubmitEvent} from "react";
import {Pencil} from "react-bootstrap-icons";
import moment from "moment";
import {readStorage, writeStorage} from "../safe-storage";

const changed = "bls-attendance-changed";

function subscribe(notify: () => void) {
    window.addEventListener("storage", notify);
    window.addEventListener(changed, notify);
    return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener(changed, notify);
    };
}

export default function PamAttendance({leagueId, week}: {leagueId: string; week: number}) {
    const key = `bls-pam-${leagueId}-week-${week}`;
    const saved = useSyncExternalStore(subscribe, () => readStorage(key), () => null);
    const arrival = moment(saved ?? "", "HH:mm", true);
    const value = arrival.isValid() ? `Present · ${arrival.format("h:mm A")}`
        : saved === "present" ? "Present" : saved === "absent" ? "Absent" : "Not recorded";
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState("");
    const timeInput = useRef<HTMLInputElement>(null);
    const [error, setError] = useState(false);
    const id = useId();
    const toggle = useRef<HTMLButtonElement>(null);

    function edit() {
        setStatus(arrival.isValid() || saved === "present" ? "present" : saved === "absent" ? "absent" : "");
        setError(false);
        setOpen(!open);
    }

    function close() {
        setOpen(false);
        toggle.current?.focus();
    }

    function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const entry = status === "present" ? timeInput.current?.value || "present" : status;
        if (!writeStorage(key, entry || null)) {
            setError(true);
            return;
        }
        window.dispatchEvent(new window.Event(changed));
        close();
    }

    return <>
        <dl className="bls-matchup-attendance">
            <dt>Pam</dt>
            <dd><button type="button" ref={toggle} onClick={edit} aria-expanded={open} aria-controls={open ? id : undefined}
                aria-label={`Edit Pam’s attendance for week ${week}: ${value}`}>
                {value}<Pencil size={14} aria-hidden="true"/>
            </button></dd>
        </dl>
        {open && <form id={id} className="bls-attendance-editor" aria-label={`Pam’s attendance for week ${week}`} onSubmit={save}>
            <label>Attendance
                <select className="form-select form-select-sm" value={status} onChange={event => { setStatus(event.target.value); }}>
                    <option value="">Not recorded</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                </select>
            </label>
            {status === "present" && <label>Arrival time (Denver, optional)
                <input className="form-control form-control-sm" type="time" ref={timeInput} defaultValue={arrival.isValid() ? arrival.format("HH:mm") : ""}/>
            </label>}
            <button type="submit" className="btn btn-primary btn-sm">Save</button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={close}>Cancel</button>
            {error ? <p role="alert">Couldn’t save. Allow browser storage and try again.</p> : <p>Saved only in this browser.</p>}
        </form>}
    </>;
}

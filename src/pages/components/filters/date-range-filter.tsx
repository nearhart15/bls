/*
 * Shared from/to date filter used on any page that already has scope filters.
 */

import type {FC} from "react";
import {Form} from "react-bootstrap";

interface Props {
    from: string;
    to: string;
    onChange: (from: string, to: string) => void;
}

const DateRangeFilter: FC<Props> = ({from, to, onChange}) => {
    return (
        <div className="bls-date-range row g-2 align-items-end mt-2">
            <div className="col-6 col-md-4">
                <Form.Label className="bls-meta-label" htmlFor="bls-date-from">From date</Form.Label>
                <Form.Control
                    id="bls-date-from"
                    type="date"
                    size="sm"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => onChange(e.target.value, to)}
                />
            </div>
            <div className="col-6 col-md-4">
                <Form.Label className="bls-meta-label" htmlFor="bls-date-to">To date</Form.Label>
                <Form.Control
                    id="bls-date-to"
                    type="date"
                    size="sm"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => onChange(from, e.target.value)}
                />
            </div>
            <div className="col-12 col-md-4">
                {(from || to) ? (
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onChange("", "")}>
                        Clear dates
                    </button>
                ) : (
                    <div className="text-body-secondary fs-sm">Optional. Overrides the preset filters.</div>
                )}
            </div>
        </div>
    );
};

export default DateRangeFilter;

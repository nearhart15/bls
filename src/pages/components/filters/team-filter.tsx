import {Dropdown, Form} from "react-bootstrap";

interface TeamFilterProps {
    teams: string[];
    selected: string[];
    onChange: (teams: string[]) => void;
    idPrefix: string;
    size?: "sm" | "lg";
    fullWidth?: boolean;
}

export function TeamFilter({teams, selected, onChange, idPrefix, size, fullWidth = false}: TeamFilterProps) {
    const label = selected.length === 0 ? "All teams" : selected.length === 1 ? selected[0] : `${selected.length} teams`;
    return <Dropdown autoClose="outside">
        <Dropdown.Toggle size={size} variant="outline-secondary" className={fullWidth ? "w-100 text-start" : undefined}>{label}</Dropdown.Toggle>
        <Dropdown.Menu style={{maxHeight: 320, overflowY: "auto", minWidth: 220}}>
            <Dropdown.Header>Teams</Dropdown.Header>
            <Dropdown.Item as="button" onClick={() => { onChange([]); }} active={selected.length === 0}>All teams</Dropdown.Item>
            <Dropdown.Divider/>
            {teams.map(team => <div className="px-3 py-1" key={team}>
                <Form.Check type="checkbox" id={`${idPrefix}-${team.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} label={team}
                    checked={selected.includes(team)} onChange={() => { onChange(selected.includes(team) ? selected.filter(value => value !== team) : [...selected, team]); }}/>
            </div>)}
        </Dropdown.Menu>
    </Dropdown>;
}

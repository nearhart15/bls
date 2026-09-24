import {createContext, type FC, type PropsWithChildren, useContext, useMemo, useState} from "react";
import {readStorage, writeStorage} from "./safe-storage";

export type DataSource = "frame" | "api";

interface DataSourceContextValue {
    source: DataSource;
    setSource: (source: DataSource) => void;
}

const STORAGE_KEY = "bls-data-source";
const DataSourceContext = createContext<DataSourceContextValue | null>(null);

export const DataSourceProvider: FC<PropsWithChildren> = ({children}) => {
    const [source, setSourceState] = useState<DataSource>(() => {
        const saved = readStorage(STORAGE_KEY);
        return saved === "api" ? "api" : "frame";
    });

    const value = useMemo<DataSourceContextValue>(() => ({
        source,
        setSource: (next) => {
            writeStorage(STORAGE_KEY, next);
            setSourceState(next);
        },
    }), [source]);

    return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
};

export function useDataSource(): DataSourceContextValue {
    const value = useContext(DataSourceContext);
    if (!value) throw new Error("useDataSource must be used inside DataSourceProvider");
    return value;
}

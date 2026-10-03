import {useCallback, useMemo, useSyncExternalStore} from "react";
import {BS_BP_XXL, getBreakpoint} from "./ui-utils";

const serverMediaSnapshot = () => false;
const serverBreakpointSnapshot = () => BS_BP_XXL;

function subscribeToResize(listener: () => void): () => void {
    window.addEventListener("resize", listener);
    return () => { window.removeEventListener("resize", listener); };
}

export function useBreakpoint() {
    return useSyncExternalStore(subscribeToResize, getBreakpoint, serverBreakpointSnapshot);
}

export function useIsNarrow(maxWidth = 767): boolean {
    const media = useMemo(
        () => typeof window === "undefined" ? null : window.matchMedia(`(max-width: ${maxWidth}px)`),
        [maxWidth]
    );
    const subscribe = useCallback((listener: () => void) => {
        media?.addEventListener("change", listener);
        return () => { media?.removeEventListener("change", listener); };
    }, [media]);
    const getSnapshot = useCallback(() => media?.matches ?? false, [media]);
    return useSyncExternalStore(subscribe, getSnapshot, serverMediaSnapshot);
}

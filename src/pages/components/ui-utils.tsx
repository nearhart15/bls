/*
 * Copyright (c) 2025. Bindul Bhowmik
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface Breakpoint {
    order: number;
    minWidth: number;
    maxWidth: number;
    name: string;
}

// These numbers could possibly be moved to .env files, but first it is not worth it, second don't want anyone messing with them
export const BS_BP_XS : Breakpoint = {order: 1, minWidth: 0, maxWidth: 575, name: 'xs'};
export const BS_BP_SM : Breakpoint = {order: 2, minWidth: 576, maxWidth: 767, name: 'sm'};
export const BS_BP_MD : Breakpoint = {order: 3, minWidth: 768, maxWidth: 991, name: 'md'};
export const BS_BP_LG : Breakpoint = {order: 4, minWidth: 992, maxWidth: 1199, name: 'lg'};
export const BS_BP_XL : Breakpoint = {order: 5, minWidth: 1200, maxWidth: 1399, name: 'xl'};
export const BS_BP_XXL : Breakpoint = {order: 6, minWidth: 1400, maxWidth: Number.MAX_SAFE_INTEGER, name: 'xxl'};

export const BREAKPOINTS : Breakpoint[] = [BS_BP_XS, BS_BP_SM, BS_BP_MD, BS_BP_LG, BS_BP_XL, BS_BP_XXL];

export const getBreakpoint = () => {
    const width = window.innerWidth;
    const bp = BREAKPOINTS.find(bp => (width >= bp.minWidth && width < bp.maxWidth + 1));
    return bp ?? BS_BP_XXL;
};

export function isBreakpointSmallerThan (check?: Breakpoint, comparison?: Breakpoint) {
    return check && comparison && check.order <= comparison.order;
}

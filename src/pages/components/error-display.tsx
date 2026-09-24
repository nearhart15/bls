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

import {type FC, useEffect, useState} from "react";
import {Container, Alert} from "react-bootstrap";
import {ExclamationOctagonFill} from "react-bootstrap-icons";
import {BS_BP_XS, BS_BP_SM, BS_BP_MD, BS_BP_LG, BS_BP_XL, BS_BP_XXL, getBreakpoint} from "./ui-utils";

const SCREEN_SIZE_MAX_WIDTH = new Map([
    [BS_BP_XS, "20rem"],
    [BS_BP_SM, "25rem"],
    [BS_BP_MD, "35rem"],
    [BS_BP_LG, "40rem"],
    [BS_BP_XL, "50rem"],
    [BS_BP_XXL, "60rem"],
]);
const SAFE_MAX_WIDTH = "20rem";

const truncateMessage = (message: string) => {
    const maxMsgLen = import.meta.env.VITE_ERROR_MAX_DETAILS_TEXT_LEN;
    if (message && message.length > maxMsgLen) {
        return message.substring(0, maxMsgLen) + '...';
    }
    return message;
}

interface ErrorDisplayProps {
    message?: string;
    error?: unknown;
    onClose?: (show: boolean, event: Event) => void;
}
const ErrorDisplay: FC<ErrorDisplayProps> = ({message, error, onClose} :ErrorDisplayProps) => {
    const [maxWidth, setMaxWidth] = useState<string>("20rem");

    useEffect(() => {
        const handleResize = () => {
            const breakpoint = getBreakpoint();
            setMaxWidth(SCREEN_SIZE_MAX_WIDTH.get(breakpoint) ?? SAFE_MAX_WIDTH);
        };
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    const em = (import.meta.env.DEV && error) ? (error as Error).name + " " + truncateMessage((error as Error).message) : null;

    if (import.meta.env.DEV) console.error("Error in BLS App: ", message, error);
    return (
        <Container fluid={true} id="error-display" className="d-flex justify-content-center">
            <Alert variant="warning" dismissible={true} onClose={onClose} style={{maxWidth: maxWidth}}>
                <Alert.Heading><ExclamationOctagonFill/> Your last action failed!</Alert.Heading>
                {message && <p>{message}</p>}
                {em && <><hr /><p className="mb-0 font-monospace fs-xs">For the nerds: {em}</p></>}
            </Alert>
        </Container>
    );
}

export default ErrorDisplay;
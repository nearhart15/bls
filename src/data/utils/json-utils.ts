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

import {
    JsonConvert,
    JsonConverter,
    type JsonCustomConvert,
    OperationMode,
    PropertyConvertingMode
} from "json2typescript";
import type {Moment} from "moment";
import moment from "moment";

export function createJsonConverter() {
    const jsonConvert = new JsonConvert();
    // TODO: Have to see if we can move this to config, does not seem easy as it is defined constants
    jsonConvert.operationMode = OperationMode.ENABLE; // OperationMode.LOGGING
    jsonConvert.propertyConvertingMode = PropertyConvertingMode.IGNORE_NULLABLE;
    return jsonConvert;
}

@JsonConverter
export class DayOfWeekConverter implements JsonCustomConvert<Moment | null> {
    serialize(data: Moment | null) {
        if (data != null) {
            return data.format("dddd");
        }
        return null;
    }
    deserialize(data: string): Moment | null {
        if (data === "") return null;
        if (!["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].includes(data)) throw new Error("Invalid bowling weekday");
        return moment().day(data);
    }
}

@JsonConverter
export class HHMMTimeConverter implements JsonCustomConvert<Moment | null> {
    serialize(data: Moment | null) {
        if (data != null) {
            return data.format("HH:mm");
        }
        return null;
    }
    deserialize(data: string): Moment | null {
        if (data === "") return null;
        const result = moment(data, "HH:mm", true);
        if (!result.isValid()) throw new Error("Invalid time");
        return result;
    }
}

@JsonConverter
export class DateConverter implements JsonCustomConvert<Moment | null> {
    serialize(data: Moment | null) {
        if (data != null) {
            return data.format("YYYY-MM-DD");
        }
        return null;
    }
    deserialize(data: string): Moment | null {
        if (data === "") return null;
        const result = moment(data, "YYYY-MM-DD", true);
        if (!result.isValid()) throw new Error("Invalid date");
        return result;
    }
}

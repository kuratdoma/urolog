import os
import sys
import inspect
from typing import get_type_hints, List, Optional, Union, Any, Dict, get_args, get_origin
from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel

# Add app to path
sys.path.append(os.getcwd())

import app.schemas.patient_schemas as patient_schemas
import app.schemas.clinical_schemas as clinical_schemas
import app.schemas.finance_schemas as finance_schemas
import app.schemas.user as user_schemas
import app.schemas.appointment as appt_schemas
import app.schemas.definition as def_schemas
import app.schemas.dashboard as dashboard_schemas
import app.schemas.stock as stock_schemas
import app.schemas.audit as audit_schemas

modules = [
    patient_schemas, clinical_schemas, finance_schemas, 
    user_schemas, appt_schemas, def_schemas, 
    dashboard_schemas, stock_schemas, audit_schemas
]

TYPE_MAPPING = {
    str: "string",
    int: "number",
    float: "number",
    bool: "boolean",
    date: "string",
    datetime: "string",
    UUID: "string",
    Any: "any",
    dict: "{ [key: string]: any }",
    Dict: "{ [key: string]: any }",
    None: "null",
    type(None): "null"
}

def get_ts_type(py_type) -> str:
    origin = get_origin(py_type)
    args = get_args(py_type)

    if py_type in TYPE_MAPPING:
        return TYPE_MAPPING[py_type]
    
    if origin is list or origin is List:
        inner_type = get_ts_type(args[0]) if args else "any"
        return f"{inner_type}[]"
    
    if origin is dict or origin is Dict:
        return "{ [key: string]: any }"

    if origin is Union:
        # Filter out NoneType for Optional
        filtered_args = [arg for arg in args if arg is not type(None)]
        ts_args = [get_ts_type(arg) for arg in filtered_args]
        return " | ".join(ts_args)

    if hasattr(py_type, "__name__"):
        if issubclass(py_type, BaseModel):
            return py_type.__name__
        return py_type.__name__

    return "any"

def generate_interface(model: type[BaseModel]) -> str:
    lines = [f"export interface {model.__name__} {{"]
    
    # Use model_fields for Pydantic V2
    for name, field in model.model_fields.items():
        ts_type = get_ts_type(field.annotation)
        is_optional = not field.is_required()
        
        # If it is Optional in type hint or has a default, mark with ?
        optional_marker = "?" if is_optional else ""
        lines.append(f"  {name}{optional_marker}: {ts_type};")
    
    lines.append("}\n")
    return "\n".join(lines)

def main():
    all_models = []
    seen_models = set()

    for module in modules:
        for name, obj in inspect.getmembers(module):
            if inspect.isclass(obj) and issubclass(obj, BaseModel) and obj is not BaseModel:
                if obj not in seen_models:
                    all_models.append(obj)
                    seen_models.add(obj)

    ts_content = "/* eslint-disable @typescript-eslint/no-explicit-any */\n"
    ts_content += "// This file is auto-generated. Do not edit manually.\n\n"
    
    for model in all_models:
        try:
            ts_content += generate_interface(model)
        except Exception as e:
            print(f"Error generating interface for {model.__name__}: {e}")

    output_path = "/app/generated_types.ts" # Path inside container
    with open(output_path, "w") as f:
        f.write(ts_content)
    
    print(f"Successfully generated {len(all_models)} interfaces.")

if __name__ == "__main__":
    main()

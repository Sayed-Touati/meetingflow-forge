export function getEditableInputValue(value) {
    if (Array.isArray(value)) {
        return value.map(getEditableInputValue).filter(Boolean).join("; ");
    }

    if (value?.target && "value" in value.target) {
        return value.target.value ?? "";
    }

    if (value?.currentTarget && "value" in value.currentTarget) {
        return value.currentTarget.value ?? "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (value?.displayName) {
        return value.displayName;
    }

    if (value?.title) {
        return value.title;
    }

    if (value?.text) {
        return value.text;
    }

    if (value?.name) {
        return value.name;
    }

    return "";
}

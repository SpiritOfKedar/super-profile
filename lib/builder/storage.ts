import { logError } from "@/lib/error-utils";
import { FlowType, FormData, Website } from "@/lib/types";
import { BuilderHydrationPayload, BuilderState, initialFormData } from "@/lib/builder/state";

const BUILDER_DRAFT_KEY = "builder_draft";
const WEBSITE_LIST_KEY = "websites_list";

interface BuilderDraftPayload {
    formData: FormData;
    step: number;
    subStep: number;
    flowType: FlowType;
}

interface BuilderHydrationInput {
    pathname: string;
    search: string;
}

function isFlowType(value: string | null | undefined): value is FlowType {
    return value === "digital" || value === "list" || value === "existing";
}

export function getFlowTypeFromPathname(pathname: string): FlowType | undefined {
    const pathParts = pathname.split("/");
    const builderIndex = pathParts.indexOf("builder");
    const candidate = builderIndex >= 0 ? pathParts[builderIndex + 1] : undefined;
    return isFlowType(candidate) ? candidate : undefined;
}

function parseJSON<T>(raw: string | null): T | null {
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as T;
    } catch (err) {
        logError("builder storage parse json", err);
        return null;
    }
}

function getWebsiteFromDemoIndex(indexText: string): Partial<FormData> | null {
    const index = parseInt(indexText, 10);
    if (Number.isNaN(index)) {
        return null;
    }

    const list = getWebsitesList();
    const demoItem = list[index] as Website | undefined;

    if (!demoItem) {
        return null;
    }

    return {
        title: demoItem.title,
        price: (demoItem.price || "").replace(/[^\d]/g, ""),
        coverImage: demoItem.image
    };
}

export function loadBuilderHydrationPayload(input: BuilderHydrationInput): BuilderHydrationPayload {
    if (typeof window === "undefined") {
        return {};
    }

    const urlFlowType = getFlowTypeFromPathname(input.pathname);
    const urlParams = new URLSearchParams(input.search);
    const editSlug = urlParams.get("edit");

    if (editSlug) {
        const savedWebsite = parseJSON<FormData>(localStorage.getItem(`website_${editSlug}`));

        if (savedWebsite) {
            return {
                formData: { ...initialFormData, ...savedWebsite },
                step: 1,
                subStep: 1,
                flowType: urlFlowType
            };
        }

        const demoData = getWebsiteFromDemoIndex(editSlug);
        if (demoData) {
            return {
                formData: { ...initialFormData, ...demoData },
                step: 1,
                subStep: 1,
                flowType: urlFlowType
            };
        }
    }

    const savedDraft = parseJSON<BuilderDraftPayload>(localStorage.getItem(BUILDER_DRAFT_KEY));
    if (savedDraft) {
        if (!urlFlowType || savedDraft.flowType === urlFlowType) {
            return {
                formData: { ...initialFormData, ...savedDraft.formData },
                step: savedDraft.step || 1,
                subStep: savedDraft.subStep || 1,
                flowType: savedDraft.flowType || urlFlowType
            };
        }
    }

    if (urlFlowType) {
        return { flowType: urlFlowType };
    }

    return {};
}

export function saveBuilderDraft(state: BuilderState) {
    if (typeof window === "undefined") {
        return;
    }

    const draftPayload: BuilderDraftPayload = {
        formData: state.formData,
        step: state.step,
        subStep: state.subStep,
        flowType: state.flowType
    };

    localStorage.setItem(BUILDER_DRAFT_KEY, JSON.stringify(draftPayload));
}

export function clearBuilderDraft() {
    if (typeof window === "undefined") {
        return;
    }
    localStorage.removeItem(BUILDER_DRAFT_KEY);
}

export function saveWebsiteBySlug(slug: string, formData: FormData) {
    if (typeof window === "undefined") {
        return;
    }

    localStorage.setItem(`website_${slug}`, JSON.stringify(formData));
}

export function getWebsitesList(): Website[] {
    if (typeof window === "undefined") {
        return [];
    }

    return parseJSON<Website[]>(localStorage.getItem(WEBSITE_LIST_KEY)) || [];
}

export function saveWebsitesList(list: Website[]) {
    if (typeof window === "undefined") {
        return;
    }

    localStorage.setItem(WEBSITE_LIST_KEY, JSON.stringify(list));
}

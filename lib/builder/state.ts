import { FlowType, FormData } from "@/lib/types";

export interface BuilderState {
    flowType: FlowType;
    step: number;
    subStep: number;
    formData: FormData;
    isLive: boolean;
}

export const initialFormData: FormData = {
    title: "",
    category: "",
    cta: "Get It Now",
    description: "",
    pricingType: "fixed",
    price: "",
    discountPrice: "",
    pppEnabled: true,
    limitPurchases: true,
    themeId: "default",
    buttonColor: "#000000",
    buttonTextColor: "#FFFFFF",
    paymentPageFor: "Website Link",
    websiteLink: "",
    compulsoryBuy: false,
    customPageUrl: "",
    pageExpiry: false,
    darkTheme: false,
    deactivateSales: false,
    trackingToggle: false,
    brandColor: "#000000"
};

export const initialBuilderState: BuilderState = {
    flowType: "digital",
    step: 1,
    subStep: 1,
    formData: initialFormData,
    isLive: false
};

interface TransitionTarget {
    step: number;
    subStep: number;
    isLive?: boolean;
}

type TransitionMap = Record<string, TransitionTarget>;

const NEXT_TRANSITIONS: Record<FlowType, TransitionMap> = {
    digital: {
        "1:1": { step: 2, subStep: 1 },
        "2:1": { step: 3, subStep: 1 },
        "3:1": { step: 3, subStep: 1, isLive: true }
    },
    list: {
        "1:1": { step: 2, subStep: 1 },
        "2:1": { step: 2, subStep: 2 },
        "2:2": { step: 2, subStep: 3 },
        "2:3": { step: 3, subStep: 3 },
        "3:3": { step: 3, subStep: 3, isLive: true }
    },
    existing: {
        "1:1": { step: 1, subStep: 1 }
    }
};

const PREV_TRANSITIONS: Record<FlowType, TransitionMap> = {
    digital: {
        "2:1": { step: 1, subStep: 1 },
        "3:1": { step: 2, subStep: 1 }
    },
    list: {
        "2:1": { step: 1, subStep: 1 },
        "2:2": { step: 2, subStep: 1 },
        "2:3": { step: 2, subStep: 2 },
        "3:3": { step: 2, subStep: 3 }
    },
    existing: {}
};

function getTransitionKey(step: number, subStep: number) {
    return `${step}:${subStep}`;
}

function applyTransition(
    state: BuilderState,
    transitions: Record<FlowType, TransitionMap>
): BuilderState {
    const key = getTransitionKey(state.step, state.subStep);
    const target = transitions[state.flowType]?.[key];

    if (!target) {
        return state;
    }

    return {
        ...state,
        step: target.step,
        subStep: target.subStep,
        isLive: target.isLive ?? state.isLive
    };
}

export interface BuilderHydrationPayload {
    flowType?: FlowType;
    step?: number;
    subStep?: number;
    isLive?: boolean;
    formData?: Partial<FormData>;
}

export type BuilderAction =
    | { type: "hydrate"; payload: BuilderHydrationPayload }
    | { type: "setFlowType"; payload: FlowType }
    | { type: "setStep"; payload: number }
    | { type: "setSubStep"; payload: number }
    | { type: "setIsLive"; payload: boolean }
    | { type: "replaceForm"; payload: FormData }
    | { type: "patchForm"; payload: Partial<FormData> }
    | { type: "setFormField"; field: keyof FormData; value: FormData[keyof FormData] }
    | { type: "updateForm"; updater: (prev: FormData) => FormData }
    | { type: "nextStep" }
    | { type: "prevStep" }
    | { type: "reset" };

export const builderActions = {
    hydrate: (payload: BuilderHydrationPayload): BuilderAction => ({ type: "hydrate", payload }),
    setFlowType: (payload: FlowType): BuilderAction => ({ type: "setFlowType", payload }),
    setStep: (payload: number): BuilderAction => ({ type: "setStep", payload }),
    setSubStep: (payload: number): BuilderAction => ({ type: "setSubStep", payload }),
    setIsLive: (payload: boolean): BuilderAction => ({ type: "setIsLive", payload }),
    replaceForm: (payload: FormData): BuilderAction => ({ type: "replaceForm", payload }),
    patchForm: (payload: Partial<FormData>): BuilderAction => ({ type: "patchForm", payload }),
    setFormField: (field: keyof FormData, value: FormData[keyof FormData]): BuilderAction => ({
        type: "setFormField",
        field,
        value
    }),
    updateForm: (updater: (prev: FormData) => FormData): BuilderAction => ({ type: "updateForm", updater }),
    nextStep: (): BuilderAction => ({ type: "nextStep" }),
    prevStep: (): BuilderAction => ({ type: "prevStep" }),
    reset: (): BuilderAction => ({ type: "reset" })
};

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
    switch (action.type) {
        case "hydrate": {
            return {
                ...state,
                ...action.payload,
                formData: action.payload.formData
                    ? { ...initialFormData, ...action.payload.formData }
                    : state.formData
            };
        }
        case "setFlowType":
            return {
                ...state,
                flowType: action.payload,
                subStep: state.step === 2 && action.payload === "list" ? state.subStep : 1
            };
        case "setStep":
            return { ...state, step: action.payload };
        case "setSubStep":
            return { ...state, subStep: action.payload };
        case "setIsLive":
            return { ...state, isLive: action.payload };
        case "replaceForm":
            return { ...state, formData: action.payload };
        case "patchForm":
            return { ...state, formData: { ...state.formData, ...action.payload } };
        case "setFormField":
            return {
                ...state,
                formData: {
                    ...state.formData,
                    [action.field]: action.value
                }
            };
        case "updateForm":
            return { ...state, formData: action.updater(state.formData) };
        case "nextStep":
            return applyTransition(state, NEXT_TRANSITIONS);
        case "prevStep":
            return applyTransition(state, PREV_TRANSITIONS);
        case "reset":
            return {
                ...state,
                step: 1,
                subStep: 1,
                isLive: false,
                formData: { ...initialFormData }
            };
        default:
            return state;
    }
}

export function canGoBack(state: BuilderState): boolean {
    return Boolean(PREV_TRANSITIONS[state.flowType]?.[getTransitionKey(state.step, state.subStep)]);
}

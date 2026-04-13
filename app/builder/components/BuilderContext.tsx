"use client";

import React, { createContext, useContext } from "react";
import { FlowType, FormData } from "@/lib/types";
import {
    builderActions,
    BuilderAction,
    BuilderState,
    builderReducer,
    canGoBack,
    initialBuilderState
} from "@/lib/builder/state";
import {
    clearBuilderDraft,
    loadBuilderHydrationPayload,
    saveBuilderDraft
} from "@/lib/builder/storage";

const DRAFT_SAVE_DEBOUNCE_MS = 300;

interface BuilderContextType {
    state: BuilderState;
    dispatch: React.Dispatch<BuilderAction>;
    flowType: FlowType;
    setFlowType: (type: FlowType) => void;
    step: number;
    setStep: React.Dispatch<React.SetStateAction<number>>;
    subStep: number;
    setSubStep: React.Dispatch<React.SetStateAction<number>>;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    setFormField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
    patchFormData: (patch: Partial<FormData>) => void;
    updateFormData: (updater: (prev: FormData) => FormData) => void;
    isLive: boolean;
    setIsLive: (isLive: boolean) => void;
    nextStep: () => void;
    prevStep: () => void;
    canGoBack: boolean;
    isHydrated: boolean;
    resetBuilder: () => void;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export function BuilderProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = React.useReducer(builderReducer, initialBuilderState);
    const [isHydrated, setIsHydrated] = React.useState(false);
    const latestStateRef = React.useRef(state);

    const flowType = state.flowType;
    const step = state.step;
    const subStep = state.subStep;
    const formData = state.formData;
    const isLive = state.isLive;

    React.useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const payload = loadBuilderHydrationPayload({
            pathname: window.location.pathname,
            search: window.location.search
        });

        dispatch(builderActions.hydrate(payload));
        setIsHydrated(true);
    }, []);

    React.useEffect(() => {
        latestStateRef.current = state;
    }, [state]);

    React.useEffect(() => {
        if (!isHydrated) {
            return;
        }

        if (isLive) {
            return;
        }

        // Persist navigation changes immediately.
        saveBuilderDraft(state);

    }, [isHydrated, isLive, state.flowType, state.step, state.subStep]);

    React.useEffect(() => {
        if (!isHydrated) {
            return;
        }

        if (isLive) {
            return;
        }

        // Debounce large form draft writes to reduce main-thread blocking on each keystroke.
        const timeoutId = window.setTimeout(() => {
            saveBuilderDraft(latestStateRef.current);
        }, DRAFT_SAVE_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [isHydrated, isLive, state.formData]);

    const setFlowType = React.useCallback((type: FlowType) => {
        dispatch(builderActions.setFlowType(type));
    }, []);

    const setStep = React.useCallback((value: React.SetStateAction<number>) => {
        if (typeof value === "function") {
            dispatch(builderActions.updateStep(value));
            return;
        }
        dispatch(builderActions.setStep(value));
    }, []);

    const setSubStep = React.useCallback((value: React.SetStateAction<number>) => {
        if (typeof value === "function") {
            dispatch(builderActions.updateSubStep(value));
            return;
        }
        dispatch(builderActions.setSubStep(value));
    }, []);

    const setFormData = React.useCallback((value: React.SetStateAction<FormData>) => {
        if (typeof value === "function") {
            dispatch(builderActions.updateForm(value));
            return;
        }
        dispatch(builderActions.replaceForm(value));
    }, []);

    const setFormField = React.useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
        dispatch(builderActions.setFormField(field, value));
    }, []);

    const patchFormData = React.useCallback((patch: Partial<FormData>) => {
        dispatch(builderActions.patchForm(patch));
    }, []);

    const updateFormData = React.useCallback((updater: (prev: FormData) => FormData) => {
        dispatch(builderActions.updateForm(updater));
    }, []);

    const setIsLive = React.useCallback((value: boolean) => {
        dispatch(builderActions.setIsLive(value));
    }, []);

    const nextStep = React.useCallback(() => {
        dispatch(builderActions.nextStep());
    }, []);

    const prevStep = React.useCallback(() => {
        dispatch(builderActions.prevStep());
    }, []);

    const resetBuilder = React.useCallback(() => {
        dispatch(builderActions.reset());
        clearBuilderDraft();
    }, []);

    const value = React.useMemo(() => ({
        state,
        dispatch,
        flowType,
        setFlowType,
        step,
        setStep,
        subStep,
        setSubStep,
        formData,
        setFormData,
        setFormField,
        patchFormData,
        updateFormData,
        isLive,
        setIsLive,
        nextStep,
        prevStep,
        canGoBack: canGoBack(state),
        isHydrated,
        resetBuilder
    }), [
        state,
        flowType,
        setFlowType,
        step,
        setStep,
        subStep,
        setSubStep,
        formData,
        setFormData,
        setFormField,
        patchFormData,
        updateFormData,
        isLive,
        setIsLive,
        nextStep,
        prevStep,
        isHydrated
    ]);

    return (
        <BuilderContext.Provider value={value}>
            {children}
        </BuilderContext.Provider>
    );
}

export function useBuilder() {
    const context = useContext(BuilderContext);
    if (context === undefined) {
        throw new Error("useBuilder must be used within a BuilderProvider");
    }
    return context;
}

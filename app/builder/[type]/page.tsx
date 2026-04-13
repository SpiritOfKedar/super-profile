"use client";

import { useParams, useRouter } from "next/navigation";
import { useBuilder } from "../components/BuilderContext";
import DigitalProductFlow from "@/app/components/builder/DigitalProductFlow";
import ListProductFlow from "@/app/components/builder/ListProductFlow";
import { FlowType } from "@/lib/types";
import { useEffect } from "react";

export default function BuilderFlowPage() {
    const params = useParams();
    const router = useRouter();
    const type = params.type as FlowType;

    const {
        setFlowType,
        formData,
        patchFormData,
        updateFormData,
        step,
        subStep, setSubStep,
        isLive, setIsLive,
        nextStep,
        prevStep,
        canGoBack,
        resetBuilder
    } = useBuilder();

    useEffect(() => {
        setFlowType(type);
    }, [setFlowType, type]);

    const onNext = () => {
        nextStep();
    };

    const onBack = () => {
        if (!canGoBack) {
            router.push("/");
            return;
        }

        prevStep();
    };

    const onCancel = () => {
        resetBuilder();
        router.push("/");
    };

    if (type === "list") {
        return (
            <ListProductFlow
                formData={formData}
                patchFormData={patchFormData}
                updateFormData={updateFormData}
                step={step}
                subStep={subStep}
                onNext={onNext}
                onBack={onBack}
                onCancel={onCancel}
                isLive={isLive}
                setIsLive={setIsLive}
                setSubStep={setSubStep}
            />
        );
    }

    return (
        <DigitalProductFlow
            formData={formData}
            patchFormData={patchFormData}
            updateFormData={updateFormData}
            step={step}
            onNext={onNext}
            onBack={onBack}
            onCancel={onCancel}
            isLive={isLive}
            setIsLive={setIsLive}
        />
    );
}

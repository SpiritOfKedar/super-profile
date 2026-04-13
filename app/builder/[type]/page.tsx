"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBuilder } from "../components/BuilderContext";
import DigitalProductFlow from "@/app/components/builder/DigitalProductFlow";
import ListProductFlow from "@/app/components/builder/ListProductFlow";
import { FlowType } from "@/lib/types";
import { useEffect } from "react";
import { logError } from "@/lib/error-utils";

export default function BuilderFlowPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const type = params.type as FlowType;
    const editSlug = searchParams.get('edit');

    const {
        formData, setFormData,
        step, setStep,
        subStep, setSubStep,
        isLive, setIsLive,
        resetBuilder
    } = useBuilder();

    useEffect(() => {
        if (editSlug) {
            const savedData = localStorage.getItem(`website_${editSlug}`);
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    setFormData(parsed);
                } catch (e) {
                    logError("builder/[type] parse edit data", e);
                }
            } else {
                // Check if it's demo data by index
                const listRaw = localStorage.getItem('websites_list');
                const list = listRaw ? JSON.parse(listRaw) : [];
                const index = parseInt(editSlug);
                if (!isNaN(index) && list[index]) {
                    // It's a demo item without slug, convert it to formData partially
                    const demoItem = list[index];
                    setFormData({
                        ...formData,
                        title: demoItem.title,
                        price: demoItem.price.replace(/[^\d]/g, ''),
                        coverImage: demoItem.image
                    });
                }
            }
        } else {
            // New creation, but don't reset if we are already in the middle of it?
            // Actually, if you navigate to /builder/type without edit slug, it should start fresh
            // but the Context already handles the initial state.
        }
    }, [editSlug]);

    const onNext = () => {
        if (type === "digital") {
            if (step < 3) setStep(step + 1);
            else setIsLive(true);
        } else if (type === "list") {
            if (step === 1) setStep(2);
            else if (step === 2) {
                if (subStep < 3) setSubStep(subStep + 1);
                else setStep(3);
            } else if (step === 3) {
                setIsLive(true);
            }
        }
    };

    const onBack = () => {
        if (step === 1) router.push("/");
        else if (step === 2) {
            if (subStep > 1) setSubStep(subStep - 1);
            else setStep(1);
        } else if (step === 3) {
            setStep(2);
            setSubStep(3);
        }
    };

    const onCancel = () => {
        resetBuilder();
        router.push("/");
    };

    if (type === "list") {
        return (
            <ListProductFlow
                formData={formData}
                setFormData={setFormData}
                step={step}
                subStep={subStep}
                onNext={onNext}
                onBack={onBack}
                onCancel={onCancel}
                isLive={isLive}
                setIsLive={setIsLive}
                setSubStep={setSubStep}
                setStep={setStep}
            />
        );
    }

    return (
        <DigitalProductFlow
            formData={formData}
            setFormData={setFormData}
            step={step}
            onNext={onNext}
            onBack={onBack}
            onCancel={onCancel}
            isLive={isLive}
            setIsLive={setIsLive}
        />
    );
}

import {
    builderActions,
    builderReducer,
    canGoBack,
    initialBuilderState,
    initialFormData,
    BuilderState
} from "@/lib/builder/state";

describe("builder reducer", () => {
    it("hydrates with defaults and payload values", () => {
        const state = builderReducer(
            initialBuilderState,
            builderActions.hydrate({
                flowType: "list",
                step: 2,
                subStep: 2,
                formData: {
                    title: "Hydrated Title"
                }
            })
        );

        expect(state.flowType).toBe("list");
        expect(state.step).toBe(2);
        expect(state.subStep).toBe(2);
        expect(state.formData.title).toBe("Hydrated Title");
        expect(state.formData.cta).toBe(initialFormData.cta);
    });

    it("applies digital flow transitions from state machine", () => {
        let state: BuilderState = {
            ...initialBuilderState,
            flowType: "digital"
        };

        state = builderReducer(state, builderActions.nextStep());
        expect(state.step).toBe(2);
        expect(state.subStep).toBe(1);

        state = builderReducer(state, builderActions.nextStep());
        expect(state.step).toBe(3);
        expect(state.subStep).toBe(1);

        state = builderReducer(state, builderActions.prevStep());
        expect(state.step).toBe(2);
        expect(state.subStep).toBe(1);
    });

    it("applies list flow transitions including substeps", () => {
        let state: BuilderState = {
            ...initialBuilderState,
            flowType: "list"
        };

        state = builderReducer(state, builderActions.nextStep());
        expect(state.step).toBe(2);
        expect(state.subStep).toBe(1);

        state = builderReducer(state, builderActions.nextStep());
        expect(state.step).toBe(2);
        expect(state.subStep).toBe(2);

        state = builderReducer(state, builderActions.nextStep());
        expect(state.step).toBe(2);
        expect(state.subStep).toBe(3);

        state = builderReducer(state, builderActions.nextStep());
        expect(state.step).toBe(3);
        expect(state.subStep).toBe(3);

        state = builderReducer(state, builderActions.prevStep());
        expect(state.step).toBe(2);
        expect(state.subStep).toBe(3);

        state = builderReducer(state, builderActions.prevStep());
        expect(state.step).toBe(2);
        expect(state.subStep).toBe(2);

        state = builderReducer(state, builderActions.prevStep());
        expect(state.step).toBe(2);
        expect(state.subStep).toBe(1);

        state = builderReducer(state, builderActions.prevStep());
        expect(state.step).toBe(1);
        expect(state.subStep).toBe(1);
    });

    it("updates form with field and patch actions", () => {
        let state = builderReducer(initialBuilderState, builderActions.setFormField("title", "My Product"));
        expect(state.formData.title).toBe("My Product");

        state = builderReducer(
            state,
            builderActions.patchForm({
                description: "Description",
                price: "99"
            })
        );

        expect(state.formData.description).toBe("Description");
        expect(state.formData.price).toBe("99");
    });

    it("resets builder while preserving flow type", () => {
        const dirtyState: BuilderState = {
            ...initialBuilderState,
            flowType: "list",
            step: 3,
            subStep: 3,
            isLive: true,
            formData: {
                ...initialFormData,
                title: "Dirty"
            }
        };

        const state = builderReducer(dirtyState, builderActions.reset());

        expect(state.flowType).toBe("list");
        expect(state.step).toBe(1);
        expect(state.subStep).toBe(1);
        expect(state.isLive).toBe(false);
        expect(state.formData.title).toBe("");
    });
});

describe("builder canGoBack", () => {
    it("returns false on initial state and true on navigable state", () => {
        expect(canGoBack(initialBuilderState)).toBe(false);

        const navigable = {
            ...initialBuilderState,
            flowType: "digital" as const,
            step: 2,
            subStep: 1
        };

        expect(canGoBack(navigable)).toBe(true);
    });
});

export class SlideInTriggerOptions {
    name: string;
    label: string;
}

export class StyleField {
    label: string;
    className: string;
}

export class SlideInWithCTATemplate implements CampaignTemplateComponent {

    @options([
        {
            name: "timeOnPage",
            label: "Time on Page (Delay)"
        }
    ])
    triggerOptions: SlideInTriggerOptions = { name: "", label: "Select..." };

    @shownIf(this, self => self.triggerOptions.name === "timeOnPage")
    @title(" ")
    @subtitle("Second(s) on page")
    secondsOnPage: number = 0;

    @subtitle("Define slide-in background & text styling.")
    @options([
        { label: "Light on Dark", className: "evg-light-on-dark" },
        { label: "Dark on Light", className: "evg-dark-on-light" }
    ])
    style: StyleField = { label: "Light on Dark", className: "evg-light-on-dark" };

    @title("Call to action popup header")
    header: string;

    @title("Call to action popup subheader")
    subheader: string;

    @title("Form header")
    formHeader: string = "Vi hjælper jeres virksomhed fremad";

    @title("Form sub header")
    formSubHeader: string = "Udfyld formularen og bliv ringet op";

    @title("Form submit button text")
    formCTA: string = "Send";

    @title("Form exit button text")
    cancelButton: string = "Afbryd";

    @title("Form submission confirmation message")
    confirmationMessage: string = "Tak, vi kontakter dig hurtigst muligt!";

    run(context: CampaignComponentContext) {
        switch (this.triggerOptions.name) {
            case "timeOnPage":
                return {
                    triggerOptionsNumber: this.secondsOnPage * 1000
                };
            default:
                return {};
        }
    }

}

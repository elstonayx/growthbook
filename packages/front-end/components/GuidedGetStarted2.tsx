import { ExperimentInterfaceStringDates } from "back-end/types/experiment";
import { FeatureInterface } from "back-end/types/feature";
import { MetricInterface } from "back-end/types/metric";
import router from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import useOrgSettings from "../hooks/useOrgSettings";
import ImportExperimentModal from "./Experiment/ImportExperimentModal";
import CodeSnippetModal from "./Features/CodeSnippetModal";
import FeatureModal from "./Features/FeatureModal";
import GetStartedSteps from "./GetStartedSteps";
import MetricForm from "./Metrics/MetricForm";
import DataSourceForm from "./Settings/DataSourceForm";
import ReactPlayer from "react-player";
import Link from "next/link";
import LoadingOverlay from "./LoadingOverlay";

export type Task = {
  titleOne: string;
  titleTwo: string;
  text: string;
  cta: string;
  learnMoreLink?: string;
  link?: string;
  completed: boolean;
};

type Props = {
  experiments: {
    experiments: ExperimentInterfaceStringDates[];
  };
  features: FeatureInterface[];
  data?: {
    metrics: MetricInterface[];
  };
  mutate?: () => void;
};

export default function GuidedGetStarted2({
  experiments,
  features,
  data,
}: Props) {
  const [currentStep, setCurrentStep] = useState(null);
  const settings = useOrgSettings();
  const [dismissedSteps] = useState(
    settings.dismissedGettingStartedSteps || {}
  );

  // If this is coming from a feature experiment rule
  const featureExperiment = useMemo(() => {
    if (!router?.query?.featureExperiment) {
      return null;
    }
    try {
      const initialExperiment: Partial<ExperimentInterfaceStringDates> = JSON.parse(
        router?.query?.featureExperiment as string
      );
      window.history.replaceState(null, null, window.location.pathname);
      return initialExperiment;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [router?.query?.featureExperiment]);

  const steps: Task[] = [
    {
      titleOne: "Welcome to ",
      titleTwo: "GrowthBook!",
      text:
        "This quick start guide is designed to get you up and running with GrowthBook in ~15 minutes!",
      completed:
        settings?.videoInstructionsViewed ||
        dismissedSteps["Video: Growthbook 101"],
      cta: "Watch Video",
    },
    {
      titleOne: "Install an ",
      titleTwo: "SDK",
      text:
        "Integrate GrowthBook into your Javascript, React, Golang, Ruby, PHP, Python, or Android application. More languages and frameworks coming soon!",
      cta: "View Instructions",
      learnMoreLink: "Learn more about our SDKs.",
      link: "https://docs.growthbook.io/lib",
      completed:
        settings?.sdkInstructionsViewed || dismissedSteps["Install SDK"],
    },
    {
      titleOne: "Create a ",
      titleTwo: "Feature Flag",
      text:
        "Create a feature flag within GrowthBook. Use feature flags to toggle app behavior, do gradual rollouts, and run A/B tests.",
      cta: "Create Feature Flag",
      learnMoreLink: "Learn more about how to use feature flags.",
      link: "https://docs.growthbook.io/app/features",
      completed: features.length > 0 || dismissedSteps["Create a Feature Flag"],
    },
    {
      titleOne: "Add a ",
      titleTwo: "Data Source",
      text:
        "GrowthBook needs read access to where your experiment and metric data lives. We support Mixpanel, Snowflake, Redshift, BigQuery, Google Analytics, and more. If you don't see yours, let us know or open a GitHub issue.",
      cta: "Add Data Source",
      learnMoreLink: "Learn more about how to connect to a data source.",
      link: "https://docs.growthbook.io/app/datasources",
      completed: false,
      // completed: datasources.length > 0 || dismissedSteps["Add a Data Source"],
    },
    {
      titleOne: "Define a ",
      titleTwo: "Metric",
      text:
        "Create a library of metrics to experiment against. You can always add more at any time, and even add them retroactively to past experiments.",
      cta: "Define a Metric",
      learnMoreLink: "Learn more about how to use metrics.",
      link: "https://docs.growthbook.io/app/metrics",
      completed: data?.metrics.length > 0 || dismissedSteps["Define a Metric"],
    },
    {
      titleOne: "Create an ",
      titleTwo: "Experiment",
      text:
        "Import an existing experiment from your data source or create a new draft from scratch.",
      cta: "Create Experiment",
      learnMoreLink: "Learn more about experiments.",
      link: "https://docs.growthbook.io/app/experiments",
      completed:
        experiments?.experiments.length > 0 ||
        dismissedSteps["Create an Experiment"],
    },
  ];

  useEffect(() => {
    function setInitialStep() {
      steps.map((step, index) => {
        if (!step.completed) {
          setCurrentStep(index);
        } else {
          setCurrentStep(0);
        }
      });
    }

    setInitialStep();
  }, []);

  if (currentStep === null) return <LoadingOverlay />;

  return (
    <>
      <GetStartedSteps
        setCurrentStep={setCurrentStep}
        currentStep={currentStep}
        steps={steps}
      />
      <div className="d-flex flex-column">
        <div className="d-flex flex-column align-items-center p-2">
          <h1>
            <span>{steps[currentStep].titleOne}</span>
            <span style={{ color: "#7C45E9", fontWeight: "bold" }}>
              {steps[currentStep].titleTwo}
            </span>
          </h1>
          <p className="m-0" style={{ width: "85%", textAlign: "center" }}>
            {steps[currentStep].text}
          </p>
          {steps[currentStep].titleOne === "Welcome to " && (
            <Link href="/settings/team">
              <a>Not an engineer? Invite a developer to get started.</a>
            </Link>
          )}
        </div>
        <div>
          {steps[currentStep].titleOne === "Welcome to " && (
            <>
              <div className="d-flex justify-content-center m-2">
                <ReactPlayer
                  url="https://www.youtube.com/watch?v=1ASe3K46BEw"
                  controls={true}
                />
              </div>
              <div className="d-flex flex-column align-items-center">
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="btn btn-primary w-50 m-2"
                >
                  Next: Install SDK
                </button>
                <button className="btn btn-outline-primary w-50 m-2">
                  Skip Onboarding
                </button>
              </div>
            </>
          )}
          {steps[currentStep].titleOne === "Install an " && (
            <CodeSnippetModal
              inline={true}
              cta={"Next: Create Feature Flag"}
              submit={() => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}
          {steps[currentStep].titleOne === "Create a " && (
            <FeatureModal
              inline={true}
              cta={"Next: Add a Data Source"}
              onSuccess={async () => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}
          {steps[currentStep].titleOne === "Add a " && (
            <DataSourceForm
              data={{
                name: "My Datasource",
                settings: {},
              }}
              existing={false}
              source="get-started"
              inline={true}
              cta={"Next: Add a Data Source"}
              onSuccess={async () => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}
          {steps[currentStep].titleOne === "Define a " && (
            <MetricForm
              inline={true}
              cta={"Next: Create Experiment"}
              current={{}}
              edit={false}
              source="get-started"
              onSuccess={() => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}
          {steps[currentStep].titleOne === "Create an " && (
            <ImportExperimentModal
              inline={true}
              source={featureExperiment ? "feature-rule" : "get-started"}
              initialValue={featureExperiment}
              fromFeature={!!featureExperiment}
              showClose={false}
            />
          )}
        </div>
      </div>
    </>
  );
}

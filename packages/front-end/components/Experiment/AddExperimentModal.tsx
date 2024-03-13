import { FC, ReactElement, useState } from "react";
import { IconType } from "react-icons";
import { GoBeaker, GoGraph } from "react-icons/go";
import clsx from "clsx";
import track from "@front-end/services/track";
import usePermissions from "@front-end/hooks/usePermissions";
import { useDefinitions } from "@front-end/services/DefinitionsContext";
import Modal from "@front-end/components/Modal";
import styles from "./AddExperimentModal.module.scss";
import ImportExperimentModal from "./ImportExperimentModal";
import NewExperimentForm from "./NewExperimentForm";

type CTA = {
  Icon: IconType;
  onClick: () => void;
  cta: string;
  description: string | ReactElement;
  enabled: boolean;
};

const CreateExperimentCTA: FC<CTA> = ({
  Icon,
  onClick,
  cta,
  description,
  enabled,
}) => {
  return (
    <div
      className={clsx(
        styles.ctaContainer,
        enabled ? styles.enabled : styles.disabled
      )}
      onClick={enabled ? onClick : undefined}
    >
      <div className={styles.ctaButton}>
        <div className={styles.ctaIconContainer}>
          <Icon size={96} />
        </div>
        <div>
          <h3 className={styles.ctaText}>{cta}</h3>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
};

const AddExperimentModal: FC<{
  onClose: () => void;
  source: string;
}> = ({ onClose, source }) => {
  const { project } = useDefinitions();

  const permissions = usePermissions();
  const hasRunExperimentsPermission = permissions.check(
    "runExperiments",
    project,
    []
  );

  const [mode, setMode] = useState<"new" | "import" | null>(null);

  const ctas: CTA[] = [
    {
      cta: "Analyze an Existing Experiment",
      description:
        "Analyze a current or past experiment that already has data collected",
      Icon: GoGraph,
      onClick: () => {
        setMode("import");
        track("Analyze an Existing Experiment", { source });
      },
      enabled: true,
    },
    {
      cta: "Design a New Experiment",
      description: (
        <>
          Build and run a brand new experiment using{" "}
          <strong>Feature Flags</strong> or our <strong>Visual Editor</strong>
        </>
      ),
      Icon: GoBeaker,
      onClick: () => {
        setMode("new");
        track("Design a New Experiment", { source });
      },
      enabled: hasRunExperimentsPermission,
    },
  ];

  switch (mode) {
    case "new":
      return (
        <NewExperimentForm
          onClose={onClose}
          source={source}
          isNewExperiment={true}
        />
      );
    case "import":
      return <ImportExperimentModal onClose={onClose} source={source} />;
    default:
      return (
        <Modal open close={() => onClose()} size="lg" header="Add Experiment">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {ctas.map(({ cta, description, Icon, onClick, enabled }, index) => (
              <CreateExperimentCTA
                key={index}
                cta={cta}
                Icon={Icon}
                onClick={onClick}
                description={description}
                enabled={enabled}
              />
            ))}
          </div>
        </Modal>
      );
  }
};

export default AddExperimentModal;

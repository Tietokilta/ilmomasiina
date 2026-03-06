import React from "react";

import { Button, Modal } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import useStore from "../../../modules/store";
import useEvent from "../../../utils/useEvent";

type Props = {
  onProceed: () => void;
};

const MoveToQueueWarning = ({ onProceed }: Props) => {
  const { moveToQueueModal: modal, moveToQueueCanceled } = useStore((state) => state.editor);
  const { t } = useTranslation();

  const proceed = useEvent(() => {
    moveToQueueCanceled();
    onProceed();
  });

  return (
    <Modal show={!!modal} onHide={moveToQueueCanceled}>
      <Modal.Header>
        <Modal.Title>{t("editor.moveToQueue.title")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{t("editor.moveToQueue.info1", { number: modal?.count || "?" })}</p>
        <p>{t("editor.moveToQueue.info2")}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="muted" onClick={moveToQueueCanceled}>
          {t("editor.moveToQueue.action.cancel")}
        </Button>
        <Button variant="danger" onClick={proceed}>
          {t("editor.moveToQueue.action.proceed")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MoveToQueueWarning;

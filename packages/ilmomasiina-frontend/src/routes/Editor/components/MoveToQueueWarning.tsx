import React from 'react';

import { Button, Modal } from 'react-bootstrap';

import { moveToQueueCanceled } from '../../../modules/editor/actions';
import { useTypedDispatch, useTypedSelector } from '../../../store/reducers';

type Props = {
  onProceed: () => void;
};

const MoveToQueueWarning = ({ onProceed }: Props) => {
  const dispatch = useTypedDispatch();
  const modal = useTypedSelector((state) => state.editor.moveToQueueModal);

  return (
    <Modal
      show={!!modal}
      onHide={() => dispatch(moveToQueueCanceled())}
    >
      <Modal.Header>
        <Modal.Title>Do you move sign-ups to the queue?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          {'The changes you make to the quotas will move at least '}
          {modal?.count || '?'}
          {' sign-ups that have already reached the quota to the queue. Users are not notified of this automatically.'}
        </p>
        <p>
          You will surely want to continue?
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="muted" onClick={() => dispatch(moveToQueueCanceled())}>Cancel</Button>
        <Button variant="danger" onClick={onProceed}>Jack</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MoveToQueueWarning;

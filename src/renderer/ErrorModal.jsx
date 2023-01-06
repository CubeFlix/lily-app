import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export default function( { show, error, close } ) {
    return <Modal show={show} onHide={() => {
        close();
      }}>
    <Modal.Header closeButton>
      <Modal.Title>Error</Modal.Title>
    </Modal.Header>
    <Modal.Body>{error}</Modal.Body>
    <Modal.Footer>
      <Button variant="primary" onClick={() => {
        close()
      }}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>;
}
import { useState } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';

export default function Connect({ setGlobalAddress, setGlobalPort, setGlobalAllowUnauthorizedHosts, setName, setConnected }) {
    const [address, setAddress] = useState("");
    const [port, setPort] = useState(42069);
    const [allowUnauthorizedHosts, setAllowUnauthorizedHosts] = useState(false);

    const [error, setError] = useState("");

    const handleSubmit = function(e) {
      e.preventDefault();
      setError("Connecting...");
      window.api.connect(address, port, allowUnauthorizedHosts).then((resp) => {
        if (!resp.ok) {
          setError(resp.error.toString());
        } else {
          setGlobalAddress(address);
          setGlobalPort(port);
          setGlobalAllowUnauthorizedHosts(allowUnauthorizedHosts);
          setName(resp.resp.data.name);
          setConnected(true);
        }
      });
    }
    
    return (
      <Container className="d-flex align-items-center justify-content-center" style={{height: '100vh'}}>
        <Card style={{borderRadius: '1rem', width: '400px'}}>
        <Card.Header as="h4" style={{textAlign: 'center'}}>Connect to a Server</Card.Header>
        <Form onSubmit={handleSubmit} style={{padding: '20px'}}>
          <Form.Group className="mb-3">
            <Form.Label>Server Address</Form.Label>
            <Form.Control type="text" defaultValue="127.0.0.1" onChange={e => setAddress(e.target.value)}/>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Server Port</Form.Label>
            <Form.Control type="number" defaultValue="42069" onChange={e => setPort(e.target.valueAsNumber)}/>
          </Form.Group>
          <Form.Group className="mb-3" controlId="formBasicCheckbox">
            <Form.Check type="checkbox" label="Allow unauthorized hosts" onChange={e => setAllowUnauthorizedHosts(e.target.checked)}/>
          </Form.Group>
          <Button variant="primary" type="submit" style={{width: '100%'}}>Connect</Button>
          <Form.Text className="text-muted">{error}</Form.Text>
        </Form>
        </Card>
      </Container>
    )
}
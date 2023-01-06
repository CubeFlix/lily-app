import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

export default function NavBar( { name, username, handleLogout, handleLogoutAndDisconnect } ) {
    return <Navbar collapseOnSelect expand="lg" bg="dark" variant="dark">
      <Container>
        <Navbar.Brand href="#/">{name}</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="#/">Drives</Nav.Link>
            <Nav.Link href="#/admin">Admin</Nav.Link>
          </Nav>
          <Nav>
            <NavDropdown title={username} id="collasible-nav-dropdown" align={{ lg: 'end' }}>
              <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
              <NavDropdown.Item onClick={handleLogoutAndDisconnect}>Logout and Disconnect</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
}
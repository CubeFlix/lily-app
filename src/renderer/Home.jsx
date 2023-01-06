import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import { useState, useEffect } from 'react';
import { AiOutlineCloudServer, AiOutlineDownload } from 'react-icons/ai';
import ErrorModal from './ErrorModal';

export default function Home( { name, username, setLoggedIn } ) {
    const [drives, setDrives] = useState(null);

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorText, setErrorText] = useState('');

    const alertError = function(err) {
      setErrorText(err.toString());
      setShowErrorModal(true);
    }

    const getDrives = function() {
        window.api.command("info", {}).then((resp) => {
            if (!resp.ok) {
              if (resp.error == "Session expired.") {
                setLoggedIn(false);
              } else {
                alertError(resp.error);
              }
            } else {
              setDrives(resp.resp.data.drives);
            }
        })
    }

    useEffect(getDrives, []);

    const downloadDrive = async function(drive) {
      const status = await window.api.downloadPath(drive, '/');
      if (!status.ok) {
        // TODO: error
        alertError(status.error);
      }
    }

    return <><Container style={{'marginTop': '20px'}}>
        <h1 style={{marginBottom: '20px'}}>Drives</h1>
        {drives ? 
        <Table striped hover className="border table-borderless"><tbody>
        {drives.map(function(name, i){
          return <tr key={i}>
            <td className="fit"><AiOutlineCloudServer/></td>
            <td><a href={`#/drive/${name}?path=/`}>{name}</a></td>
            <td style={{textAlign: 'right'}}>
              <div className='show-hover'>
              <a onClick={() => downloadDrive(name)}><AiOutlineDownload/></a>
              </div>
            </td>
          </tr>;
        })}
        </tbody></Table> : "Loading..."}
    </Container><ErrorModal show={showErrorModal} error={errorText} close={() => setShowErrorModal(false)}/></>;
}
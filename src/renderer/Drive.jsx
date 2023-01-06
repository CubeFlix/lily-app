import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import { useState, useEffect } from 'react';
import { useParams, redirect } from "react-router-dom";
import useQuery from "./useQuery";
import { AiOutlineFile, AiOutlineFolder, AiOutlineArrowUp, AiOutlineEdit, AiOutlineDelete, AiOutlineDownload } from "react-icons/ai";
import * as pathlib from "path-browserify";
import ErrorModal from "./ErrorModal";

export default function Drive( { username, setLoggedIn } ) {
    const params = useParams();
    const query = useQuery();
    const path = query.get("path");

    if (!path) {
        // TODO: error
        console.log("no path");
    }

    const [isFile, setIsFile] = useState(false);
    const [dir, setDir] = useState(null);
    const [file, setFile] = useState(null);
    
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [fileToRename, setFileToRename] = useState('');
    const [toRenameFile, setToRenameFile] = useState(true);
    const [newName, setNewName] = useState('');

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorText, setErrorText] = useState('');

    const alertError = function(err) {
      setErrorText(err.toString());
      setShowErrorModal(true);
    }

    const getDir = function() {
        window.api.command("stat", {drive: params.driveName, paths: [path]}).then((resp) => {
            if (!resp.ok) {
              if (resp.error == "Session expired.") {
                setLoggedIn(false);
              } else {
                alertError(resp.error);
              }
            } else {
              if (!resp.resp.data.stat[path].exists) {
                redirect(`/drive/${params.driveName}?path=${pathlib.dirname(path)}`);
              }
              if (resp.resp.data.stat[path].isfile) {
                // File.
                setIsFile(true);
                setFile(resp.resp.data.stat[path]);
              } else {
                setIsFile(false);
                window.api.command("listdir", {drive: params.driveName, path: path}).then((resp) => {
                  if (!resp.ok) {
                    if (resp.error == "Session expired.") {
                      setLoggedIn(false);
                    } else {
                      alertError(resp.error);
                    }
                  } else {
                    setDir(resp.resp.data.list);
                  }
                });
              }
            }
          });
    }

    const download = async function(path) {
      const status = await window.api.download(params.driveName, path);
      if (!status.ok) {
        // TODO: error
        alertError(status.error);
      }
    }

    const downloadPath = async function(path) {
      const status = await window.api.downloadPath(params.driveName, path);
      if (!status.ok) {
        // TODO: error
        alertError(status.error);
      }
    }

    const deleteFile = async function(path) {
      const status = await window.api.command('deletefiles', {drive: params.driveName, paths: [path]});
      if (!status.ok) {
        // TODO: error
        alertError(status.error);
      }
      getDir();
    }

    const deleteDir = async function(path) {
      const status = await window.api.command('deletedirs', {drive: params.driveName, paths: [path]});
      if (!status.ok) {
        // TODO: error
        alertError(status.error);
      }
      getDir();
    }

    const upload = async function(path) {
      const status = await window.api.upload(params.driveName, path);
      if (!status.ok) {
        // TODO: error
        alertError(status.error);
      }
      getDir();
    }

    useEffect(getDir, [path]);

    return <><Container style={{marginTop: '20px'}}>
        <h1 style={{marginBottom: '20px'}}>{path} - {params.driveName}</h1>
        <div style={{marginBottom: '20px'}}>
        {path == "/" ? 
            <Button style={{marginRight: '10px'}} variant="secondary" href='#/'><AiOutlineArrowUp/> Back to Drives</Button> : 
            <Button style={{marginRight: '10px'}} variant="secondary" href={`#/drive/${params.driveName}?path=${pathlib.dirname(path)}`}><AiOutlineArrowUp/> Previous Directory</Button>}
        {!isFile ? <Button style={{marginRight: '10px'}} onClick={() => downloadPath(path)}>Download Folder</Button> : <Button style={{marginRight: '10px'}} onClick={() => download(path)}>Download</Button>}
        {!isFile ? <Button style={{marginRight: '10px'}} onClick={() => upload(path)}>Upload</Button> : null}
        {!isFile ? <Button style={{marginRight: '10px'}}>Upload Folder</Button> : null}
        <Button onClick={() => getDir()}>Refresh</Button>
        </div>
        {!isFile ? 
        (dir ? 
        <Table striped hover className="border table-borderless"><tbody>
        {dir.map(function(item, i){
          return <tr key={i} className="fit">
            <td className="fit">{item.isfile ? <AiOutlineFile/> : <AiOutlineFolder/>}</td>
            <td><a href={`#/drive/${params.driveName}?path=${pathlib.join(path, item.name)}`}>{item.name}</a></td>
            <td style={{textAlign: 'right'}}>
              <div className='show-hover'>
              <a onClick={() => {
                setShowRenameModal(true);
                setFileToRename(pathlib.join(path, item.name));
                setNewName(pathlib.basename(fileToRename));
                if (item.isfile) {
                  setToRenameFile(true);
                } else {
                  setToRenameFile(false);
                }
                }}><AiOutlineEdit/></a>
              <a onClick={item.isfile ? () => deleteFile(pathlib.join(path, item.name)) : () => deleteDir(pathlib.join(path, item.name))}><AiOutlineDelete/></a>
              {item.isfile ? <a onClick={() => download(pathlib.join(path, item.name))}><AiOutlineDownload/></a> : <a onClick={() => downloadPath(pathlib.join(path, item.name))}><AiOutlineDownload/></a>}
              </div>
            </td>
          </tr>;
        })}
        </tbody></Table> : "Loading...") : <></>}
    </Container>
    <Modal show={showRenameModal} onHide={() => {
            setShowRenameModal(false);
          }}>
        <Modal.Header closeButton>
          <Modal.Title>Rename {fileToRename}</Modal.Title>
        </Modal.Header>
        <Form.Control type="email" placeholder="New name" defaultValue={pathlib.basename(fileToRename)} onChange={(e) => setNewName(e.target.value)}/>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowRenameModal(false);
          }}>
            Close
          </Button>
          <Button variant="primary" onClick={async () => {
            setShowRenameModal(false);
            if (toRenameFile) {
              const status = await window.api.command('renamefiles', {drive: params.driveName, paths: [fileToRename], newNames: [newName]});
              if (!status.ok) {
                // TODO: error
                alertError(status.error);
              }
              getDir();
            } else {
              const status = await window.api.command('renamedirs', {drive: params.driveName, paths: [fileToRename], newNames: [newName]});
              if (!status.ok) {
                // TODO: error
                alertError(status.error);
              }
              getDir();
            }
          }}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
      <ErrorModal show={showErrorModal} error={errorText} close={() => setShowErrorModal(false)}/></>;
}
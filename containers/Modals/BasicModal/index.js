import React from "react";
import { Modal } from "react-bootstrap";
import VideoPlayer from "../../../components/VideoPlayer";
import { closeOverlayAction } from "../../../store/actions/pageActions";
import "./styles.scss";

export default ({
  openOverlay,
  dispatch,
  overlaySettings: { video, img, content } = {}
} = {}) => {
  const closeOverlay = () => {
    dispatch(closeOverlayAction());
  };

  return (
    <Modal
      show={openOverlay === "basic"}
      onHide={closeOverlay}
      aria-labelledby="page-modal"
      className="page-modal basic-modal"
    >
      <Modal.Header
        closeButton
        className="modal-header"
        style={{ height: "auto" }}
      >
        <Modal.Title id="modal-header" />
      </Modal.Header>
      <Modal.Body className="modal-body" style={{ padding: "0" }}>
        {img && (
          <img
            src={img}
            className="img-responsive "
            style={{ width: "100%" }}
            alt="background"
          />
        )}
        {video && (
          <VideoPlayer
            url={video}
            containerStyle={{ padding: "0", width: "100%" }}
            playing
          />
        )}
        {content && <div className="overlay-content">{content}</div>}
      </Modal.Body>
    </Modal>
  );
};

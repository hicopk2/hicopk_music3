// Main application logic

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('hicopk Music App initialized');
  // Initialize components and event listeners
});
document.addEventListener(
    "DOMContentLoaded",
    () => {

        const audioInput =
            document.getElementById(
                "audioInput"
            );

        const artworkInput =
            document.getElementById(
                "artworkInput"
            );

        const chooseButton =
            document.getElementById(
                "chooseAudioButton"
            );

        const dropzone =
            document.getElementById(
                "uploadDropzone"
            );

        const selectedAudio =
            document.getElementById(
                "selectedAudio"
            );

        const audioName =
            document.getElementById(
                "audioName"
            );

        const audioSize =
            document.getElementById(
                "audioSize"
            );

        const removeAudio =
            document.getElementById(
                "removeAudio"
            );

        const uploadButton =
            document.getElementById(
                "uploadTrackButton"
            );

        const progressBar =
            document.getElementById(
                "uploadProgressBar"
            );

        const progressText =
            document.getElementById(
                "uploadProgressText"
            );


        if (!audioInput || !uploadButton) {
            return;
        }


        let selectedFile = null;


        chooseButton.addEventListener(
            "click",
            () => {
                audioInput.click();
            }
        );


        audioInput.addEventListener(
            "change",
            () => {

                if (
                    audioInput.files.length
                ) {

                    selectAudio(
                        audioInput.files[0]
                    );
                }
            }
        );


        function selectAudio(file) {

            const validation =
                HicopkUploader.validateFile(
                    file,
                    "audio"
                );


            if (!validation.valid) {

                alert(
                    validation.message
                );

                return;
            }


            selectedFile = file;

            audioName.textContent =
                file.name;

            audioSize.textContent =
                HicopkUploader.formatBytes(
                    file.size
                );

            selectedAudio.hidden =
                false;
        }


        removeAudio.addEventListener(
            "click",
            () => {

                selectedFile = null;

                audioInput.value = "";

                selectedAudio.hidden =
                    true;
            }
        );


        [
            "dragenter",
            "dragover"
        ].forEach(eventName => {

            dropzone.addEventListener(
                eventName,
                event => {

                    event.preventDefault();

                    dropzone.classList.add(
                        "dragging"
                    );
                }
            );
        });


        [
            "dragleave",
            "drop"
        ].forEach(eventName => {

            dropzone.addEventListener(
                eventName,
                event => {

                    event.preventDefault();

                    dropzone.classList.remove(
                        "dragging"
                    );
                }
            );
        });


        dropzone.addEventListener(
            "drop",
            event => {

                const file =
                    event.dataTransfer.files[0];

                if (file) {
                    selectAudio(file);
                }
            }
        );


        uploadButton.addEventListener(
            "click",
            async () => {

                if (!selectedFile) {

                    alert(
                        "Choose an audio file first."
                    );

                    return;
                }


                const title =
                    document.getElementById(
                        "trackTitle"
                    ).value.trim();


                if (!title) {

                    alert(
                        "Enter a track title."
                    );

                    return;
                }


                const artwork =
                    artworkInput.files[0] ||
                    null;


                const metadata = {

                    title,

                    artist:
                        document.getElementById(
                            "trackArtist"
                        ).value,

                    description:
                        document.getElementById(
                            "trackDescription"
                        ).value,

                    genre:
                        document.getElementById(
                            "trackGenre"
                        ).value,

                    tags:
                        document.getElementById(
                            "trackTags"
                        ).value,

                    album:
                        document.getElementById(
                            "trackAlbum"
                        ).value,

                    release_date:
                        document.getElementById(
                            "trackReleaseDate"
                        ).value,

                    lyrics:
                        document.getElementById(
                            "trackLyrics"
                        ).value,

                    explicit:
                        document.getElementById(
                            "trackExplicit"
                        ).checked,

                    visibility:
                        document.getElementById(
                            "trackVisibility"
                        ).value
                };


                uploadButton.disabled =
                    true;

                uploadButton.textContent =
                    "Uploading...";


                try {

                    const result =
                        await HicopkUploader.upload(
                            selectedFile,
                            artwork,
                            metadata,

                            percent => {

                                progressBar.style.width =
                                    `${percent}%`;

                                progressText.textContent =
                                    `Uploading ${percent}%`;
                            }
                        );


                    progressText.textContent =
                        "Upload complete!";


                    uploadButton.textContent =
                        "Uploaded ✓";


                    console.log(
                        "Uploaded track:",
                        result.track
                    );


                } catch (error) {

                    console.error(error);

                    progressText.textContent =
                        error.message;

                    uploadButton.disabled =
                        false;

                    uploadButton.textContent =
                        "Upload track";
                }
            }
        );

    }
);
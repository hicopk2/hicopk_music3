const HicopkUploader = (() => {

    const MAX_FILE_SIZE =
        500 * 1024 * 1024;


    const AUDIO_TYPES = [
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "audio/flac",
        "audio/mp4",
        "audio/x-m4a",
        "audio/ogg",
        "audio/webm"
    ];


    const ARTWORK_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    function formatBytes(bytes) {

        if (!bytes) {
            return "0 B";
        }

        const units = [
            "B",
            "KB",
            "MB",
            "GB"
        ];

        const index =
            Math.floor(
                Math.log(bytes) /
                Math.log(1024)
            );

        return (
            bytes /
            Math.pow(1024, index)
        ).toFixed(1) +
        " " +
        units[index];
    }


    function validateFile(
        file,
        type
    ) {

        if (!file) {
            return {
                valid: false,
                message: "No file selected."
            };
        }


        if (
            file.size >
            MAX_FILE_SIZE
        ) {

            return {
                valid: false,
                message:
                    "File is larger than 500MB."
            };
        }


        const allowed =
            type === "audio"
                ? AUDIO_TYPES
                : ARTWORK_TYPES;


        if (
            !allowed.includes(
                file.type
            )
        ) {

            return {
                valid: false,
                message:
                    "This file type is not supported."
            };
        }


        return {
            valid: true
        };
    }


    async function upload(
        audioFile,
        artworkFile,
        metadata = {},
        onProgress
    ) {

        const audioValidation =
            validateFile(
                audioFile,
                "audio"
            );


        if (!audioValidation.valid) {
            throw new Error(
                audioValidation.message
            );
        }


        if (artworkFile) {

            const artworkValidation =
                validateFile(
                    artworkFile,
                    "artwork"
                );


            if (!artworkValidation.valid) {
                throw new Error(
                    artworkValidation.message
                );
            }
        }


        const formData =
            new FormData();


        formData.append(
            "audio",
            audioFile
        );


        if (artworkFile) {

            formData.append(
                "artwork",
                artworkFile
            );
        }


        Object.entries(metadata)
            .forEach(([key, value]) => {

                formData.append(
                    key,
                    value ?? ""
                );

            });


        return new Promise(
            (resolve, reject) => {

                const xhr =
                    new XMLHttpRequest();


                xhr.open(
                    "POST",
                    "/api/tracks/upload"
                );


                xhr.withCredentials =
                    true;


                xhr.upload.addEventListener(
                    "progress",
                    event => {

                        if (
                            event.lengthComputable &&
                            typeof onProgress ===
                                "function"
                        ) {

                            const percent =
                                Math.round(
                                    (
                                        event.loaded /
                                        event.total
                                    ) * 100
                                );

                            onProgress(
                                percent,
                                event.loaded,
                                event.total
                            );
                        }
                    }
                );


                xhr.onload = () => {

                    let data;

                    try {
                        data =
                            JSON.parse(
                                xhr.responseText
                            );
                    } catch {
                        data = {};
                    }


                    if (
                        xhr.status >= 200 &&
                        xhr.status < 300
                    ) {

                        resolve(data);

                    } else {

                        reject(
                            new Error(
                                data.error ||
                                "Upload failed."
                            )
                        );
                    }
                };


                xhr.onerror = () => {

                    reject(
                        new Error(
                            "Network error during upload."
                        )
                    );
                };


                xhr.send(formData);
            }
        );
    }


    return {
        upload,
        validateFile,
        formatBytes
    };

})();
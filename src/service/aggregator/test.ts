/**
 *
 * @param ldes_stream
 */
async function subscribe_webhook_notification(ldes_stream: string): Promise<void> {
    const solid_server = ldes_stream.split("/").slice(0, 3).join("/");
    ldes_stream = ldes_stream.replace("http://", "");
    ldes_stream = ldes_stream.replace(/\//g, "-");
    ldes_stream = ldes_stream.slice(0, -1);
    ldes_stream = ldes_stream.replace(":", "-")
    const webhook_notification_server = solid_server + "/.notifications/WebhookChannel2023/";
    const post_body = {
        "@context": ["https://www.w3.org/ns/solid/notification/v1"],
        "type": "http://www.w3.org/ns/solid/notifications#WebhookChannel2023",
        "topic": `${ldes_stream}`,
        "sendTo": `http://localhost:8080/${ldes_stream}/`
    };

    const response = await fetch(webhook_notification_server, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/ld+json',
            'Accept': 'application/ld+json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(post_body)
    });

    const response_json = await response.json();
    console.log(response_json);
}

/**
 *
 */
async function main() {
    const ldes_stream = "http://localhost:3000/dataset_participant1/xyz/";
    await subscribe_webhook_notification(ldes_stream);
}

main();
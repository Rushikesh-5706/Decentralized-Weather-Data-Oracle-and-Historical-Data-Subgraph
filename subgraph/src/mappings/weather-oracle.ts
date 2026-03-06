import { Bytes } from "@graphprotocol/graph-ts"
import { WeatherReport, WeatherRequest } from "../../generated/schema"
import { WeatherReported as WeatherReportedEvent, WeatherRequested as WeatherRequestedEvent } from "../../generated/WeatherOracle/WeatherOracle"

export function handleWeatherReported(event: WeatherReportedEvent): void {
    let entity = new WeatherReport(event.params.requestId)
    entity.city = event.params.city
    entity.temperature = event.params.temperature.toI32()
    entity.description = event.params.description
    entity.timestamp = event.block.timestamp

    // Get requester from the original request
    let request = WeatherRequest.load(event.params.requestId)
    if (request != null) {
        entity.requester = request.requester
    } else {
        // Fallback if somehow request wasn't processed first
        entity.requester = event.transaction.from
    }

    entity.transactionHash = event.transaction.hash
    entity.save()
}

export function handleWeatherRequested(event: WeatherRequestedEvent): void {
    let entity = new WeatherRequest(event.params.requestId)
    entity.city = event.params.city
    entity.requester = event.params.requester
    entity.timestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash
    entity.save()
}

using AIPlantHealthCheck.Domain.AggregatesModel.OrderAggregate;

namespace AIPlantHealthCheck.Web.Application.IntegrationEvents;

public record OrderPaidIntegrationEvent(OrderId OrderId);

using AIPlantHealthCheck.Domain.AggregatesModel.OrderAggregate;

namespace AIPlantHealthCheck.Domain.DomainEvents;

public record OrderCreatedDomainEvent(Order Order) : IDomainEvent;

public record OrderPaidDomainEvent(Order Order) : IDomainEvent;

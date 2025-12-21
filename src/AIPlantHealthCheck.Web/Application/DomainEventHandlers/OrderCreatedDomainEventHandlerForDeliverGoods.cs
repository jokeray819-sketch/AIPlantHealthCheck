using AIPlantHealthCheck.Domain.DomainEvents;
using AIPlantHealthCheck.Web.Application.Commands.Delivers;

namespace AIPlantHealthCheck.Web.Application.DomainEventHandlers;

public class OrderCreatedDomainEventHandlerForDeliverGoods(IMediator mediator) : IDomainEventHandler<OrderCreatedDomainEvent>
{
    public Task Handle(OrderCreatedDomainEvent notification, CancellationToken cancellationToken)
    {
        return mediator.Send(new DeliverGoodsCommand(notification.Order.Id), cancellationToken);
    }
}
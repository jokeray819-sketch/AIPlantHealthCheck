using RabbitMQ.Client;
using System.Text;

namespace AIPlantHealthCheck.Infrastructure.RabbitMQ;

public class RabbitMQService
{
    private readonly IConnection _connection;
    private readonly IChannel _channel;

    public RabbitMQService(IConnection connection)
    {
        _connection = connection;
        _channel = _connection.CreateChannelAsync().GetAwaiter().GetResult();
    }

    public async Task PublishMessageAsync(string queueName, string message)
    {
        await _channel.QueueDeclareAsync(
            queue: queueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);

        var body = Encoding.UTF8.GetBytes(message);

        await _channel.BasicPublishAsync(
            exchange: string.Empty,
            routingKey: queueName,
            body: body);
    }

    public async Task DeclareQueueAsync(string queueName)
    {
        await _channel.QueueDeclareAsync(
            queue: queueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);
    }
}
